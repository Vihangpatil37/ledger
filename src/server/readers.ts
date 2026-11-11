import "server-only";

import { paiseToDecimalString } from "@/lib/money";
import { entriesCol, peopleCol } from "@/lib/mongo";
import { getOwner } from "@/server/session";
import type {
  EntryType,
  HomeSummary,
  PersonDetail,
  PersonListRow,
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Every query filters by ownerId
  const [people, balances, recentRaw, overdueRaw] = await Promise.all([
    peopleCol()
      .find({ ownerId: owner }, { projection: { name: 1, phone: 1 } })
      .sort({ name: 1 })
      .toArray(),
    entriesCol()
      .aggregate<{ _id: string; gave: number; received: number }>([
        { $match: { ownerId: owner } },
        { $group: { _id: "$personId", ...BALANCE_GROUP } },
      ])
      .toArray(),
    entriesCol()
      .find({ ownerId: owner })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray(),
    entriesCol()
      .find(
        {
          ownerId: owner,
          type: "GAVE",
          dueDate: { $lt: today, $ne: null },
        },
        { projection: { personId: 1 } }
      )
      .toArray(),
  ]);

  const personNameById = new Map(
    people.map((p) => [p._id, p.name])
  );

  const balanceByPersonId = new Map(
    balances.map((row) => [row._id, row])
  );

  const overduePersonIds = new Set(overdueRaw.map((e) => e.personId));

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
  id: string
): Promise<PersonDetail | null> {
  const owner = await getOwner();
  if (!owner) return null;

  // The ownerId filter keeps other owners' people invisible.
  const person = await peopleCol().findOne(
    { _id: id, ownerId: owner },
    { projection: { name: 1, phone: 1 } }
  );
  if (!person) return null;

  const [balanceRes, entries] = await Promise.all([
    entriesCol()
      .aggregate<{ _id: null; gave: number; received: number }>([
        { $match: { personId: id, ownerId: owner } },
        { $group: { _id: null, ...BALANCE_GROUP } },
      ])
      .toArray(),
    entriesCol()
      .find(
        { personId: id, ownerId: owner },
        { projection: { type: 1, amountCents: 1, note: 1, dueDate: 1, createdAt: 1 } }
      )
      .sort({ createdAt: 1, _id: 1 })
      .limit(1000)
      .toArray(),
  ]);

  const balance = balanceRes[0] ?? { gave: 0, received: 0 };

  // Running balance builds up chronologically...
  let runningCents = 0;
  const chronological = entries.map((entry) => {
    runningCents +=
      entry.type === "GAVE" ? entry.amountCents : -entry.amountCents;
    return {
      id: entry._id,
      type: entry.type as EntryType,
      amount: paiseToDecimalString(entry.amountCents),
      note: entry.note,
      dueDate: entry.dueDate ? entry.dueDate.toISOString().split("T")[0] : null,
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
    entries: chronological,
  };
}


