import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetOwner = vi.fn();
const mockPeopleFindToArray = vi.fn();
const mockEntriesAggregateToArray = vi.fn();
const mockEntriesFindToArray = vi.fn();
const mockEntriesFind = vi.fn().mockImplementation(() => ({
  toArray: mockEntriesFindToArray,
  sort: () => ({ toArray: mockEntriesFindToArray }),
}));
const mockUsersFindOne = vi.fn().mockResolvedValue({ upiId: "shop@upi", upiName: "Chai Shop" });
const mockPromisesFindToArray = vi.fn().mockResolvedValue([]);

vi.mock("@/server/session", () => ({
  getOwner: () => mockGetOwner(),
}));

vi.mock("@/lib/mongo", () => ({
  peopleCol: () => ({
    find: () => ({
      toArray: mockPeopleFindToArray,
      sort: () => ({ toArray: mockPeopleFindToArray }),
    }),
  }),
  entriesCol: () => ({
    aggregate: () => ({
      toArray: mockEntriesAggregateToArray,
    }),
    find: (...args: unknown[]) => mockEntriesFind(...args),
  }),
  usersCol: () => ({
    findOne: mockUsersFindOne,
  }),
  promisesCol: () => ({
    find: () => ({
      toArray: mockPromisesFindToArray,
    }),
  }),
}));

import { getFollowUpQueue, getTrashItems } from "@/server/readers";

describe("getFollowUpQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOwner.mockResolvedValue("owner-1");
  });

  it("prioritizes broken promise first, then overdue debtor, and excludes settled debtors", async () => {
    const istTodayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    const [y, m, d] = istTodayStr.split("-").map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1));
    const twoDaysAgo = new Date(Date.UTC(y, m - 1, d - 2));

    // People
    mockPeopleFindToArray.mockResolvedValue([
      {
        _id: "person-broken",
        name: "Broken Promise Customer",
        phone: "9876543210",
        promiseDate: yesterday, // Promise date in past
        promiseNote: "said will pay yesterday",
        lastRemindedAt: twoDaysAgo,
      },
      {
        _id: "person-overdue",
        name: "Overdue Customer",
        phone: "9876543211",
        promiseDate: null,
      },
      {
        _id: "person-settled",
        name: "Settled Customer",
        phone: "9876543212",
        promiseDate: null,
      },
    ]);

    // Balances
    mockEntriesAggregateToArray.mockResolvedValue([
      { _id: "person-broken", gave: 50000, received: 0 },
      { _id: "person-overdue", gave: 100000, received: 0 },
      { _id: "person-settled", gave: 50000, received: 50000 }, // zero balance
    ]);

    // Entries for loans/due dates
    mockEntriesFindToArray.mockResolvedValue([
      {
        personId: "person-broken",
        type: "GAVE",
        amountCents: 50000,
        createdAt: twoDaysAgo,
      },
      {
        personId: "person-overdue",
        type: "GAVE",
        amountCents: 100000,
        dueDate: twoDaysAgo, // Overdue loan
        createdAt: twoDaysAgo,
      },
      {
        personId: "person-settled",
        type: "GAVE",
        amountCents: 50000,
        createdAt: twoDaysAgo,
      },
    ]);

    const queue = await getFollowUpQueue();
    expect(queue).toHaveLength(2); // Settled customer excluded
    expect(mockEntriesFind).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "owner-1",
        createdAt: { $gte: expect.any(Date) },
      }),
      expect.anything()
    );

    // 1st item must be broken promise
    expect(queue[0].name).toBe("Broken Promise Customer");
    expect(queue[0].urgency).toBe("BROKEN_PROMISE");
    expect(queue[0].waHref).toContain("https://wa.me/919876543210");

    // 2nd item must be overdue
    expect(queue[1].name).toBe("Overdue Customer");
    expect(queue[1].urgency).toBe("OVERDUE");
  });
});

describe("getTrashItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOwner.mockResolvedValue("owner-1");
  });

  it("lists soft-deleted people and entries with remaining retention days", async () => {
    const deletedDate = new Date();
    mockPeopleFindToArray.mockResolvedValue([
      {
        _id: "p-deleted",
        name: "Old Contact",
        phone: "9999999999",
        deletedAt: deletedDate,
      },
    ]);

    mockEntriesFindToArray.mockResolvedValue([
      {
        _id: "e-deleted",
        personId: "p-deleted",
        type: "GAVE",
        amountCents: 25000,
        note: "Old chai",
        deletedAt: deletedDate,
      },
    ]);

    const trash = await getTrashItems();
    expect(trash).toHaveLength(2);
    expect(trash.some((t) => t.kind === "PERSON" && t.title === "Old Contact")).toBe(true);
    expect(trash.some((t) => t.kind === "ENTRY" && t.amount === "250.00")).toBe(true);
  });
});
