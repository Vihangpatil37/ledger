import "server-only";

import { paiseToDecimalString } from "@/lib/money";
import { entriesCol, peopleCol, promisesCol, staffCol, usersCol } from "@/lib/mongo";
import { resolveIstRange } from "@/lib/range";
import { computeReliabilityScore } from "@/lib/reliability";
import { activeFilter, getDaysRemaining } from "@/lib/trash";
import {
  buildFollowUpMessage,
  normalizeWaPhone,
  universalWaLink,
} from "@/lib/whatsapp";
import { getOwner, getSession } from "@/server/session";
import type {
  DateRange,
  EntryType,
  FollowUpItem,
  HomeSummary,
  OwnerProfile,
  PersonDetail,
  PersonListRow,
  StaffItem,
  StaffShiftSummary,
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
    createdBy: e.createdBy ?? null,
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

  // The ownerId filter keeps other owners' people invisible; exclude soft-deleted
  const person = await peopleCol().findOne(
    { _id: id, ownerId: owner, ...activeFilter() },
    {
      projection: {
        name: 1,
        phone: 1,
        promiseDate: 1,
        promiseNote: 1,
        lastRemindedAt: 1,
      },
    }
  );
  if (!person) return null;

  const { fromDate, toDateExclusive } = resolveIstRange(range);

  const createdAtFilter: Record<string, unknown> = {};
  if (fromDate) createdAtFilter.$gte = fromDate;
  if (toDateExclusive) createdAtFilter.$lt = toDateExclusive;

  const entriesQuery: Record<string, unknown> = {
    personId: id,
    ownerId: owner,
    ...activeFilter(),
  };
  if (fromDate || toDateExclusive) {
    entriesQuery.createdAt = createdAtFilter;
  }

  const [balanceRes, openingRes, entries, ownerDoc, promisesRes, allLifetimeEntries] =
    await Promise.all([
      // Lifetime total balance
      entriesCol()
        .aggregate<{ _id: null; gave: number; received: number }>([
          { $match: { personId: id, ownerId: owner, ...activeFilter() } },
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
                  ...activeFilter(),
                  createdAt: { $lt: fromDate },
                },
              },
              { $group: { _id: null, ...BALANCE_GROUP } },
            ])
            .toArray()
        : Promise.resolve([]),
      entriesCol()
        .find(entriesQuery, {
          projection: {
            type: 1,
            amountCents: 1,
            note: 1,
            dueDate: 1,
            editedAt: 1,
            createdAt: 1,
          },
        })
        .sort({ createdAt: 1, _id: 1 })
        .toArray(),
      usersCol().findOne(
        { _id: owner },
        { projection: { upiId: 1, upiName: 1 } }
      ),
      // Broken promises count for reliability scoring
      promisesCol
        ? promisesCol()
            .find({ personId: id, ownerId: owner, status: "BROKEN" })
            .toArray()
            .catch(() => [])
        : Promise.resolve([]),
      // All lifetime entries if range was filtered, otherwise entries is already all
      fromDate || toDateExclusive
        ? entriesCol()
            .find(
              { personId: id, ownerId: owner, ...activeFilter() },
              {
                projection: {
                  type: 1,
                  amountCents: 1,
                  createdAt: 1,
                  dueDate: 1,
                },
              }
            )
            .toArray()
        : Promise.resolve(null),
    ]);

  const balance = balanceRes[0] ?? { gave: 0, received: 0 };
  const opening = openingRes[0] ?? { gave: 0, received: 0 };
  const openingBalanceCents = fromDate ? opening.gave - opening.received : 0;

  const session = await getSession();
  const isStaff = session?.role === "STAFF";

  // Running balance builds up chronologically from opening balance...
  let runningCents = openingBalanceCents;
  const chronological = entries.map((entry) => {
    runningCents +=
      entry.type === "GAVE" ? entry.amountCents : -entry.amountCents;

    const canEdit = isStaff ? false : true;

    return {
      id: entry._id,
      type: entry.type as EntryType,
      amount: paiseToDecimalString(entry.amountCents),
      note: entry.note,
      dueDate: entry.dueDate ? entry.dueDate.toISOString().split("T")[0] : null,
      editedAt: entry.editedAt ? entry.editedAt.toISOString() : null,
      createdAt: entry.createdAt.toISOString(),
      running: paiseToDecimalString(runningCents),
      createdBy: entry.createdBy ?? null,
      canEdit,
    };
  });
  // ...then the list is shown newest first.
  chronological.reverse();

  // Compute reliability score
  const entriesForReliability = allLifetimeEntries ?? entries;
  const reliability = computeReliabilityScore({
    entries: entriesForReliability,
    brokenPromisesCount: promisesRes.length,
  });

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
    reliability,
    lastRemindedAt: person.lastRemindedAt
      ? person.lastRemindedAt.toISOString()
      : null,
    promiseDate: person.promiseDate
      ? person.promiseDate.toISOString().split("T")[0]
      : null,
    promiseNote: person.promiseNote ?? null,
    entries: chronological,
  };
}

/**
 * Returns prioritized queue of customers who need follow-up today:
 * 1. Broken promises (promiseDate <= today in IST)
 * 2. Overdue loans
 * 3. Due today
 * 4. Due soon (<= 3 days)
 */
export async function getFollowUpQueue(): Promise<FollowUpItem[]> {
  const owner = await getOwner();
  if (!owner) return [];

  const istTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const today = new Date(`${istTodayStr}T00:00:00+05:30`);
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [people, balances, ownerDoc, brokenPromises] =
    await Promise.all([
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
        .toArray(),
      entriesCol()
        .aggregate<{ _id: string; gave: number; received: number }>([
          { $match: { ownerId: owner, ...activeFilter() } },
          { $group: { _id: "$personId", ...BALANCE_GROUP } },
        ])
        .toArray(),
      usersCol().findOne(
        { _id: owner },
        { projection: { upiId: 1, upiName: 1 } }
      ),
      promisesCol
        ? promisesCol()
            .find({ ownerId: owner, status: "BROKEN" })
            .toArray()
            .catch(() => [])
        : Promise.resolve([]),
    ]);

  const balanceByPerson = new Map(balances.map((b) => [b._id, b]));
  const debtorPersonIds = balances
    .filter((b) => b.gave > b.received)
    .map((b) => b._id);

  const debtorEntries =
    debtorPersonIds.length > 0
      ? await entriesCol()
          .find(
            {
              ownerId: owner,
              personId: { $in: debtorPersonIds },
              ...activeFilter(),
            },
            {
              projection: {
                personId: 1,
                type: 1,
                amountCents: 1,
                dueDate: 1,
                createdAt: 1,
              },
            }
          )
          .toArray()
      : [];

  const entriesByPerson = new Map<string, typeof debtorEntries>();
  for (const e of debtorEntries) {
    const list = entriesByPerson.get(e.personId) ?? [];
    list.push(e);
    entriesByPerson.set(e.personId, list);
  }

  const brokenPromisesCountByPerson = new Map<string, number>();
  for (const bp of brokenPromises) {
    const count = brokenPromisesCountByPerson.get(bp.personId) ?? 0;
    brokenPromisesCountByPerson.set(bp.personId, count + 1);
  }

  const items: FollowUpItem[] = [];

  for (const person of people) {
    const b = balanceByPerson.get(person._id);
    const balanceCents = b ? b.gave - b.received : 0;
    if (balanceCents <= 0) continue; // Only people who owe money

    const pEntries = entriesByPerson.get(person._id) ?? [];
    const brokenCount = brokenPromisesCountByPerson.get(person._id) ?? 0;
    const reliability = computeReliabilityScore({
      entries: pEntries,
      brokenPromisesCount: brokenCount,
    });

    const promiseDateStr = person.promiseDate
      ? person.promiseDate.toISOString().split("T")[0]
      : null;

    let urgency: FollowUpItem["urgency"] | null = null;
    let urgencyLabel = "";
    let urgencyDays = 0;

    // Check 1: Broken Promise
    if (promiseDateStr) {
      if (promiseDateStr < istTodayStr) {
        urgency = "BROKEN_PROMISE";
        const diffMs =
          today.getTime() - new Date(`${promiseDateStr}T00:00:00+05:30`).getTime();
        urgencyDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        urgencyLabel = `Broken Promise (${urgencyDays}d)`;
      } else if (promiseDateStr === istTodayStr) {
        urgency = "DUE_TODAY";
        urgencyLabel = "Promise Due Today";
        urgencyDays = 0;
      }
    }

    // Check 2: Overdue loan or due soon if no promise urgency yet
    if (!urgency) {
      // Find overdue loans vs repayments
      const totalReceived = b ? b.received : 0;
      const overdueLoans = pEntries
        .filter(
          (e) => e.type === "GAVE" && e.dueDate && new Date(e.dueDate) < today
        )
        .sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
        );

      const totalOverdueGave = overdueLoans.reduce(
        (sum, e) => sum + e.amountCents,
        0
      );

      if (totalOverdueGave > totalReceived && overdueLoans[0]?.dueDate) {
        urgency = "OVERDUE";
        const oldestDue = new Date(overdueLoans[0].dueDate);
        const diffMs = today.getTime() - oldestDue.getTime();
        urgencyDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        urgencyLabel = `Overdue (${urgencyDays}d)`;
      } else {
        // Check if any loan is due today or soon (within 3 days)
        const dueSoonLoans = pEntries.filter(
          (e) =>
            e.type === "GAVE" &&
            e.dueDate &&
            new Date(e.dueDate) >= today &&
            new Date(e.dueDate) <= threeDaysLater
        );

        if (dueSoonLoans.length > 0) {
          const earliestDue = new Date(
            Math.min(
              ...dueSoonLoans.map((l) => new Date(l.dueDate!).getTime())
            )
          );
          const earliestDueStr = earliestDue.toISOString().split("T")[0];

          if (earliestDueStr === istTodayStr) {
            urgency = "DUE_TODAY";
            urgencyLabel = "Due Today";
            urgencyDays = 0;
          } else {
            urgency = "DUE_SOON";
            const diffDays = Math.round(
              (earliestDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            urgencyDays = diffDays;
            urgencyLabel = `Due in ${diffDays}d`;
          }
        }
      }
    }

    if (!urgency) continue;

    const balanceStr = paiseToDecimalString(balanceCents);
    const waMessage = buildFollowUpMessage(
      {
        name: person.name,
        balance: balanceStr,
        urgency,
        promiseDate: promiseDateStr,
      },
      ownerDoc ? { upiId: ownerDoc.upiId, upiName: ownerDoc.upiName } : undefined
    );
    const normPhone = person.phone ? normalizeWaPhone(person.phone) : null;
    const waHref = normPhone ? universalWaLink(waMessage, normPhone) : null;

    items.push({
      personId: person._id,
      name: person.name,
      phone: person.phone,
      balance: balanceStr,
      urgency,
      urgencyLabel,
      urgencyDays,
      promiseDate: promiseDateStr,
      promiseNote: person.promiseNote ?? null,
      lastRemindedAt: person.lastRemindedAt
        ? person.lastRemindedAt.toISOString()
        : null,
      reliability,
      waHref,
    });
  }

  // Priority sorting:
  // 1. BROKEN_PROMISE (oldest broken promise first)
  // 2. OVERDUE (highest balance first, then oldest overdue first)
  // 3. DUE_TODAY
  // 4. DUE_SOON
  const rank: Record<FollowUpItem["urgency"], number> = {
    BROKEN_PROMISE: 1,
    OVERDUE: 2,
    DUE_TODAY: 3,
    DUE_SOON: 4,
  };

  items.sort((a, b) => {
    if (rank[a.urgency] !== rank[b.urgency]) {
      return rank[a.urgency] - rank[b.urgency];
    }
    if (a.urgency === "BROKEN_PROMISE") {
      return (a.promiseDate ?? "").localeCompare(b.promiseDate ?? "");
    }
    if (a.urgency === "OVERDUE") {
      return Number(b.balance) - Number(a.balance);
    }
    return a.urgencyDays - b.urgencyDays;
  });

  return items;
}

/** Returns soft-deleted items currently in Trash within 30-day restore window. */
export async function getTrashItems(): Promise<TrashItem[]> {
  const owner = await getOwner();
  if (!owner) return [];

  const [deletedPeople, deletedEntries] = await Promise.all([
    peopleCol()
      .find({ ownerId: owner, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .toArray(),
    entriesCol()
      .find({ ownerId: owner, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .toArray(),
  ]);

  const allPeople = await peopleCol()
    .find({ ownerId: owner }, { projection: { name: 1 } })
    .toArray();
  const personNameMap = new Map(allPeople.map((p) => [p._id, p.name]));

  const items: TrashItem[] = [];

  for (const p of deletedPeople) {
    if (!p.deletedAt) continue;
    items.push({
      id: p._id,
      kind: "PERSON",
      title: p.name,
      subtitle: p.phone ? `Phone: ${p.phone}` : "Contact",
      deletedAt: p.deletedAt.toISOString(),
      daysRemaining: getDaysRemaining(p.deletedAt),
    });
  }

  for (const e of deletedEntries) {
    if (!e.deletedAt) continue;
    const pName = personNameMap.get(e.personId) ?? "Unknown Contact";
    const typeLabel = e.type === "GAVE" ? "Udhar" : "Jama";
    items.push({
      id: e._id,
      kind: "ENTRY",
      title: `${typeLabel} · ${pName}`,
      subtitle: e.note ?? undefined,
      amount: paiseToDecimalString(e.amountCents),
      deletedAt: e.deletedAt.toISOString(),
      daysRemaining: getDaysRemaining(e.deletedAt),
      personId: e.personId,
    });
  }

  // Sort newest deleted first
  items.sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );

  return items;
}

export async function getOwnerProfile(): Promise<OwnerProfile | null> {
  const owner = await getOwner();
  if (!owner) return null;

  const user = await usersCol().findOne(
    { _id: owner },
    { projection: { email: 1, shopCode: 1, upiId: 1, upiName: 1 } }
  );
  if (!user) return null;

  let shopCode = user.shopCode;
  if (!shopCode) {
    const fallback = `CHAI-${user._id.slice(0, 4).toUpperCase()}`;
    await usersCol().updateOne(
      { _id: owner },
      { $set: { shopCode: fallback } }
    );
    shopCode = fallback;
  }

  return {
    email: user.email,
    shopCode,
    upiId: user.upiId ?? null,
    upiName: user.upiName ?? null,
  };
}

export async function getStaffShiftSummary(
  ownerId: string,
  staffId: string
): Promise<StaffShiftSummary> {
  const istTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const startOfDay = new Date(`${istTodayStr}T00:00:00+05:30`);
  const endOfDay = new Date(`${istTodayStr}T23:59:59.999+05:30`);

  const [agg, staffMember] = await Promise.all([
    entriesCol()
      .aggregate<{ collected: number; given: number; count: number }>([
        {
          $match: {
            ownerId,
            "createdBy.staffId": staffId,
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            collected: {
              $sum: { $cond: [{ $eq: ["$type", "RECEIVED"] }, "$amountCents", 0] },
            },
            given: {
              $sum: { $cond: [{ $eq: ["$type", "GAVE"] }, "$amountCents", 0] },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    staffCol().findOne({ _id: staffId, ownerId }),
  ]);

  const stats = agg[0] ?? { collected: 0, given: 0, count: 0 };
  return {
    collectedToday: paiseToDecimalString(stats.collected),
    givenToday: paiseToDecimalString(stats.given),
    entriesCount: stats.count,
    staffName: staffMember?.name ?? "Munim",
  };
}

export async function getStaffMembers(ownerId: string): Promise<StaffItem[]> {
  const staff = await staffCol().find({ ownerId }).sort({ createdAt: -1 }).toArray();
  return staff.map((s) => ({
    id: s._id,
    name: s.name,
    phone: s.phone ?? null,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  }));
}
