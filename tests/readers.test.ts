import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetOwner = vi.fn();
const mockPeopleFindOne = vi.fn();
const mockPeopleFindToArray = vi.fn();
const mockEntriesAggregateToArray = vi.fn();
const mockEntriesFindToArray = vi.fn();
const mockUsersFindOne = vi.fn().mockResolvedValue({ upiId: null, upiName: null });

const mockPeopleCursor = {
  sort: vi.fn().mockReturnThis(),
  toArray: mockPeopleFindToArray,
};

const mockFindCursor = {
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  toArray: mockEntriesFindToArray,
};

const mockAggregateCursor = {
  toArray: mockEntriesAggregateToArray,
};

vi.mock("@/server/session", () => ({
  getOwner: () => mockGetOwner(),
  getSession: async () => {
    const owner = await mockGetOwner();
    return owner ? { userId: owner } : null;
  },
}));

vi.mock("@/lib/mongo", () => ({
  peopleCol: () => ({
    findOne: mockPeopleFindOne,
    find: () => mockPeopleCursor,
  }),
  entriesCol: () => ({
    aggregate: () => mockAggregateCursor,
    find: () => mockFindCursor,
  }),
  usersCol: () => ({
    findOne: mockUsersFindOne,
  }),
  promisesCol: () => ({
    find: () => ({
      toArray: vi.fn().mockResolvedValue([]),
    }),
  }),
}));

import { getHomeSummary, getPersonDetail } from "@/server/readers";

describe("getPersonDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if user is not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const result = await getPersonDetail("person-1");
    expect(result).toBeNull();
  });

  it("returns null if person is not found for this owner", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockPeopleFindOne.mockResolvedValue(null);

    const result = await getPersonDetail("person-1");
    expect(result).toBeNull();
  });

  it("processes more than 1000 entries without truncation and calculates chronological running balance", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockPeopleFindOne.mockResolvedValue({
      _id: "person-1",
      name: "Ramesh Kumar",
      phone: "9876543210",
    });

    // 1050 entries: each GAVE 1000 paise (₹10.00)
    const count = 1050;
    const mockEntries = Array.from({ length: count }, (_, i) => ({
      _id: `entry-${i}`,
      type: "GAVE" as const,
      amountCents: 1000, // ₹10.00
      note: `Entry ${i}`,
      dueDate: null,
      createdAt: new Date(2026, 0, 1, 0, i),
    }));

    mockEntriesAggregateToArray.mockResolvedValue([
      { _id: null, gave: count * 1000, received: 0 },
    ]);
    mockEntriesFindToArray.mockResolvedValue(mockEntries);

    const result = await getPersonDetail("person-1");
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.name).toBe("Ramesh Kumar");
    expect(result.phone).toBe("9876543210");
    expect(result.gaveTotal).toBe("10500.00");
    expect(result.receivedTotal).toBe("0.00");
    expect(result.balance).toBe("10500.00");

    // Must contain all 1050 entries, not truncated to 1000
    expect(result.entries).toHaveLength(1050);

    // Entries are presented newest-first
    // Newest entry (index 0 in returned array) should be entry-1049 with running balance 10500.00
    expect(result.entries[0].id).toBe("entry-1049");
    expect(result.entries[0].running).toBe("10500.00");

    // Oldest entry (last index) should be entry-0 with running balance 10.00
    expect(result.entries[1049].id).toBe("entry-0");
    expect(result.entries[1049].running).toBe("10.00");
  });

  it("accurately computes net running balance with alternating GAVE and RECEIVED entries", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockPeopleFindOne.mockResolvedValue({
      _id: "person-2",
      name: "Sunil Verma",
      phone: null,
    });

    const mockEntries = [
      {
        _id: "e1",
        type: "GAVE" as const,
        amountCents: 50000, // +₹500
        note: "Initial loan",
        dueDate: new Date("2026-03-01T00:00:00Z"),
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
      {
        _id: "e2",
        type: "RECEIVED" as const,
        amountCents: 20000, // -₹200 -> running 300
        note: "Partial return",
        dueDate: null,
        createdAt: new Date("2026-01-05T10:00:00Z"),
      },
      {
        _id: "e3",
        type: "GAVE" as const,
        amountCents: 15000, // +₹150 -> running 450
        note: "Second loan",
        dueDate: null,
        createdAt: new Date("2026-01-10T10:00:00Z"),
      },
    ];

    mockEntriesAggregateToArray.mockResolvedValue([
      { _id: null, gave: 65000, received: 20000 },
    ]);
    mockEntriesFindToArray.mockResolvedValue(mockEntries);

    const result = await getPersonDetail("person-2");
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.balance).toBe("450.00");
    expect(result.gaveTotal).toBe("650.00");
    expect(result.receivedTotal).toBe("200.00");

    // Newest first
    expect(result.entries[0].id).toBe("e3");
    expect(result.entries[0].running).toBe("450.00");
    expect(result.entries[1].id).toBe("e2");
    expect(result.entries[1].running).toBe("300.00");
    expect(result.entries[2].id).toBe("e1");
    expect(result.entries[2].running).toBe("500.00");
  });

  it("calculates historical opening balance and adjusts filtered running balances when date range is specified", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockPeopleFindOne.mockResolvedValue({
      _id: "person-3",
      name: "Geeta Ben",
      phone: null,
    });

    // 1st aggregate call: lifetime balance (gave 1000, received 200 -> balance 800)
    // 2nd aggregate call: opening balance prior to fromDate (gave 500, received 100 -> opening balance 400)
    mockEntriesAggregateToArray
      .mockResolvedValueOnce([{ _id: null, gave: 100000, received: 20000 }])
      .mockResolvedValueOnce([{ _id: null, gave: 50000, received: 10000 }]);

    // Only entries within the filtered range
    mockEntriesFindToArray.mockResolvedValue([
      {
        _id: "e-in-range",
        type: "GAVE" as const,
        amountCents: 50000, // +₹500 on top of opening balance 400 = running 900
        note: "Recent loan",
        dueDate: null,
        editedAt: null,
        createdAt: new Date("2026-11-10T10:00:00Z"),
      },
    ]);

    const result = await getPersonDetail("person-3", { from: "2026-11-01" });
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.openingBalance).toBe("400.00");
    expect(result.balance).toBe("800.00");
    expect(result.entries).toHaveLength(1);
    // Running balance starts from opening balance (400) + 500 = 900
    expect(result.entries[0].running).toBe("900.00");
  });
});

describe("getHomeSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zeroed summary when user is not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const summary = await getHomeSummary();
    expect(summary.debtorsCount).toBe(0);
    expect(summary.creditorsCount).toBe(0);
    expect(summary.rows).toHaveLength(0);
  });

  it("aggregates debtor/creditor balances and identifies overdue borrowers", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockPeopleFindToArray.mockResolvedValue([
      { _id: "p1", name: "Borrower Overdue", phone: "111" },
      { _id: "p2", name: "Borrower Repaid", phone: "222" },
      { _id: "p3", name: "Lender (We Owe)", phone: "333" },
    ]);

    // Balances aggregation (p1: gave 1000, received 0 -> balance +1000)
    // (p2: gave 500, received 200 -> balance +300)
    // (p3: gave 0, received 800 -> balance -800)
    mockEntriesAggregateToArray
      .mockResolvedValueOnce([
        { _id: "p1", gave: 100000, received: 0 },
        { _id: "p2", gave: 50000, received: 20000 },
        { _id: "p3", gave: 0, received: 80000 },
      ])
      // Overdue query: only p1 has overdueGave > totalReceived
      .mockResolvedValueOnce([
        { _id: "p1" },
      ]);

    mockEntriesFindToArray.mockResolvedValue([]);

    const summary = await getHomeSummary();

    expect(summary.debtorsCount).toBe(2);
    expect(summary.creditorsCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.youllGet).toBe("1300.00");
    expect(summary.youllGive).toBe("800.00");
    expect(summary.netBalance).toBe("500.00");

    const p1Row = summary.rows.find((r) => r.id === "p1");
    expect(p1Row?.isOverdue).toBe(true);

    const p2Row = summary.rows.find((r) => r.id === "p2");
    expect(p2Row?.isOverdue).toBe(false);

    const p3Row = summary.rows.find((r) => r.id === "p3");
    expect(p3Row?.isOverdue).toBe(false);
  });
});
