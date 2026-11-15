import "server-only";

import { paiseToDecimalString } from "@/lib/money";
import { entriesCol, peopleCol, promisesCol, usersCol } from "@/lib/mongo";
import { resolveIstRange } from "@/lib/range";
import { computeReliabilityScore } from "@/lib/reliability";
import { activeFilter, getDaysRemaining } from "@/lib/trash";
import {
  buildFollowUpMessage,
  normalizeWaPhone,
  universalWaLink,
} from "@/lib/whatsapp";
import { getOwner } from "@/server/session";
import type {
  DateRange,
  EntryType,
  FollowUpItem,
  HomeSummary,
  OwnerProfile,
  PersonDetail,
  PersonListRow,
  TrashItem,
} from "@/lib/types";

const BALANCE_GROUP = {
  gave: {
    $sum: { $cond: [{ $eq: ["$type", "GAVE"] }, "$amountCents", 0] },
  },
  received: {
    $sum: { $cond: [{ $eq: ["$type", "RECEIVED"] }, "$amountCents", 0] },
  },
} as const;

export async function getHomeSummary(): Promise<HomeSummary> {
  const owner = await getOwner();
  if (!owner) {
    return {
      youllGet: "0",
      youllGive: "0",
      netBalance: "0",
      debtorsCount: 0,
      creditorsCount: 0,
      settledCount: 0,
      overdueCount: 0,
      rows: [],
      recentEntries: [],
    };
  }

  // Pin "today" to Asia/Kolkata so overdue checks are stable in IST,
  // not shifted by the server's UTC clock (Vercel runs in UTC).
  const istTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const today = new Date(`${istTodayStr}T00:00:00+05:30`);

  // Every query filters by ownerId and active (non-soft-deleted) records
  const [people, balances, recentRaw, overdueRaw] = await Promise.all([
    peopleCol()
      .find(
        { ownerId: owner, ...activeFilter() },
        {
          projection: {
            name: 1,
            phone: 1,
            promiseDate: 1,
            promiseNote: 1,
            lastRemindedAt: 1,
          },
        }
      )
      .sort({ name: 1 })
      .toArray(),
    entriesCol()
      .aggregate<{ _id: string; gave: number; received: number }>([
        { $match: { ownerId: owner, ...activeFilter() } },
        { $group: { _id: "$personId", ...BALANCE_GROUP } },
      ])
      .toArray(),
    entriesCol()
      .find({ ownerId: owner, ...activeFilter() })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray(),
    // For each person, sum overdue GAVE amounts vs total RECEIVED.
    // A person is overdue only when past-due loans are not fully
    // covered by repayments — prevents false positives on repaid loans.
    entriesCol()
      .aggregate<{ _id: string }>([
        {
          $match: {
            ownerId: owner,
            ...activeFilter(),
            $or: [
              { type: "GAVE", dueDate: { $lt: today, $ne: null } },
              { type: "RECEIVED" },
            ],
          },
        },
        {
          $group: {
            _id: "$personId",
            overdueGave: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$type", "GAVE"] },
                      { $ne: ["$dueDate", null] },
                      { $lt: ["$dueDate", today] },
                    ],
                  },
                  "$amountCents",
                  0,
                ],
              },
            },
            totalReceived: {
              $sum: {
                $cond: [{ $eq: ["$type", "RECEIVED"] }, "$amountCents", 0],
              },
            },
          },
        },
        { $match: { $expr: { $gt: ["$overdueGave", "$totalReceived"] } } },
      ])
      .toArray(),
  ]);

  const personNameById = new Map(people.map((p) => [p._id, p.name]));
  const balanceByPersonId = new Map(balances.map((row) => [row._id, row]));
  const overduePersonIds = new Set(overdueRaw.map((r) => r._id));

  let youllGetCents = 0;
  let youllGiveCents = 0;
  let debtorsCount = 0;
  let creditorsCount = 0;
  let settledCount = 0;
  let overdueCount = 0;

  const rows: PersonListRow[] = people.map((person) => {
    const row = balanceByPersonId.get(person._id);
    const balance = row ? row.gave - row.received : 0;
    const isOverdue = balance > 0 && overduePersonIds.has(person._id);

    if (balance > 0) {
      youllGetCents += balance;
      debtorsCount += 1;
      if (isOverdue) overdueCount += 1;
    } else if (balance < 0) {
      youllGiveCents += -balance;
      creditorsCount += 1;
    } else {
      settledCount += 1;
    }

    return {
      id: person._id,
      name: person.name,
      phone: person.phone,
      balance: paiseToDecimalString(balance),
      isOverdue,
      lastRemindedAt: person.lastRemindedAt
        ? person.lastRemindedAt.toISOString()
        : null,
      promiseDate: person.promiseDate
        ? person.promiseDate.toISOString().split("T")[0]
        : null,
    };
  });

  // People you can collect from first.
  rows.sort((a, b) => Number(b.balance) - Number(a.balance));

  const recentEntries = recentRaw.map((e) => ({
    id: e._id,
    personId: e.personId,
    personName: personNameById.get(e.personId) ?? "Unknown",
    type: e.type as EntryType,
    amount: paiseToDecimalString(e.amountCents),
    note: e.note,
    dueDate: e.dueDate ? e.dueDate.toISOString().split("T")[0] : null,
    editedAt: e.editedAt ? e.editedAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
  }));

  const netCents = youllGetCents - youllGiveCents;

  return {
    youllGet: paiseToDecimalString(youllGetCents),
    youllGive: paiseToDecimalString(youllGiveCents),
    netBalance: paiseToDecimalString(netCents),
    debtorsCount,
    creditorsCount,
    settledCount,
    overdueCount,
    rows,
    recentEntries,
  };
}

export async function getPersonDetail(
  id: string,
  range?: DateRange
): Promise<PersonDetail | null> {
  const owner = await getOwner();
  if (!owner) return null;

  // The ownerId filter keeps other owners' people invisible.
  const person = await peopleCol().findOne(
    { _id: id, ownerId: owner },
    { projection: { name: 1, phone: 1 } }
  );
  if (!person) return null;

  const { fromDate, toDateExclusive } = resolveIstRange(range);

  const createdAtFilter: Record<string, unknown> = {};
  if (fromDate) createdAtFilter.$gte = fromDate;
  if (toDateExclusive) createdAtFilter.$lt = toDateExclusive;

  const entriesQuery: Record<string, unknown> = {
    personId: id,
    ownerId: owner,
  };
  if (fromDate || toDateExclusive) {
    entriesQuery.createdAt = createdAtFilter;
  }

  const [balanceRes, openingRes, entries, ownerDoc] = await Promise.all([
    // Lifetime total balance
    entriesCol()
      .aggregate<{ _id: null; gave: number; received: number }>([
        { $match: { personId: id, ownerId: owner } },
        { $group: { _id: null, ...BALANCE_GROUP } },
      ])
      .toArray(),
    // Opening balance before fromDate (only computed if fromDate is set)
    fromDate
      ? entriesCol()
          .aggregate<{ _id: null; gave: number; received: number }>([
            {
              $match: {
                personId: id,
                ownerId: owner,
                createdAt: { $lt: fromDate },
              },
            },
            { $group: { _id: null, ...BALANCE_GROUP } },
          ])
          .toArray()
      : Promise.resolve([]),
    entriesCol()
      .find(
        entriesQuery,
        { projection: { type: 1, amountCents: 1, note: 1, dueDate: 1, editedAt: 1, createdAt: 1 } }
      )
      .sort({ createdAt: 1, _id: 1 })
      .toArray(),
    usersCol().findOne(
      { _id: owner },
      { projection: { upiId: 1, upiName: 1 } }
    ),
  ]);

  const balance = balanceRes[0] ?? { gave: 0, received: 0 };
  const opening = openingRes[0] ?? { gave: 0, received: 0 };
  const openingBalanceCents = fromDate ? opening.gave - opening.received : 0;

  // Running balance builds up chronologically from opening balance...
  let runningCents = openingBalanceCents;
  const chronological = entries.map((entry) => {
    runningCents +=
      entry.type === "GAVE" ? entry.amountCents : -entry.amountCents;
    return {
      id: entry._id,
      type: entry.type as EntryType,
      amount: paiseToDecimalString(entry.amountCents),
      note: entry.note,
      dueDate: entry.dueDate ? entry.dueDate.toISOString().split("T")[0] : null,
      editedAt: entry.editedAt ? entry.editedAt.toISOString() : null,
      createdAt: entry.createdAt.toISOString(),
      running: paiseToDecimalString(runningCents),
    };
  });
  // ...then the list is shown newest first.
  chronological.reverse();

  return {
    id: person._id,
    name: person.name,
    phone: person.phone,
    gaveTotal: paiseToDecimalString(balance.gave),
    receivedTotal: paiseToDecimalString(balance.received),
    balance: paiseToDecimalString(balance.gave - balance.received),
    openingBalance: fromDate ? paiseToDecimalString(openingBalanceCents) : null,
    range,
    ownerUpi: ownerDoc
      ? {
          upiId: ownerDoc.upiId ?? null,
          upiName: ownerDoc.upiName ?? null,
        }
      : null,
    entries: chronological,
  };
}

export async function getOwnerProfile(): Promise<OwnerProfile | null> {
  const owner = await getOwner();
  if (!owner) return null;

  const user = await usersCol().findOne(
    { _id: owner },
    { projection: { email: 1, upiId: 1, upiName: 1 } }
  );
  if (!user) return null;

  return {
    email: user.email,
    upiId: user.upiId ?? null,
    upiName: user.upiName ?? null,
  };
}
