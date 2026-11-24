import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockRevalidatePath = vi.fn();

const mockPeopleFindToArray = vi.fn();
const mockPeopleInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 });
const mockPeopleUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });

const mockEntriesInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 });
const mockPromisesInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 });
const mockInvalidatePromptCache = vi.fn();

const mockWithTransaction = vi.fn(async (cb: () => Promise<unknown>) => cb());
const mockEndSession = vi.fn().mockResolvedValue(undefined);
const mockStartSession = vi.fn(() => ({
  withTransaction: mockWithTransaction,
  endSession: mockEndSession,
}));

vi.mock("@/server/session", () => ({
  getSession: () => mockGetSession(),
  getOwner: async () => {
    const s = await mockGetSession();
    return s?.userId ?? null;
  },
}));

vi.mock("@/lib/voice/prompt-builder", () => ({
  invalidatePromptCache: (...args: unknown[]) => mockInvalidatePromptCache(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/mongo", () => ({
  peopleCol: () => ({
    find: () => ({
      toArray: mockPeopleFindToArray,
    }),
    insertMany: mockPeopleInsertMany,
    updateOne: mockPeopleUpdateOne,
  }),
  entriesCol: () => ({
    insertMany: mockEntriesInsertMany,
  }),
  promisesCol: () => ({
    insertMany: mockPromisesInsertMany,
  }),
  usersCol: () => ({
    findOne: vi.fn(),
  }),
  mongoClient: () => ({
    startSession: mockStartSession,
  }),
}));

import { commitCsvImport, restoreBackupJson } from "@/actions/backup";

describe("restoreBackupJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "owner-test-1" });
    mockPeopleFindToArray.mockResolvedValue([]);
  });

  it("restores promises into promisesCol and maps personId", async () => {
    const payload = {
      version: "chai_ledger_backup_v2",
      exportedAt: new Date().toISOString(),
      owner: { email: "owner@test.com" },
      people: [
        {
          id: "backup-p-1",
          name: "Ramesh Customer",
          phone: "+91 98765 43210",
          promiseDate: "2026-11-20",
          promiseNote: "Pay by cash",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      entries: [
        {
          id: "backup-e-1",
          personId: "backup-p-1",
          type: "GAVE",
          amountCents: 50000,
          note: "Chai bill",
          dueDate: "2026-11-20",
          createdAt: new Date().toISOString(),
        },
      ],
      promises: [
        {
          id: "backup-pr-1",
          personId: "backup-p-1",
          promiseDate: "2026-11-20",
          note: "Promise on Friday",
          status: "PENDING",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const res = await restoreBackupJson(JSON.stringify(payload));
    expect(res.ok).toBe(true);
    expect(res.count?.people).toBe(1);
    expect(res.count?.entries).toBe(1);
    expect(res.count?.promises).toBe(1);

    // Verify peopleCol bulk inserted with parsed IST date
    expect(mockPeopleInsertMany).toHaveBeenCalledTimes(1);
    const insertedPeople = mockPeopleInsertMany.mock.calls[0][0];
    expect(insertedPeople).toHaveLength(1);
    expect(insertedPeople[0].name).toBe("Ramesh Customer");
    expect(insertedPeople[0].promiseDate).toBeInstanceOf(Date);
    // 2026-11-20 IST midnight is 18:30 UTC previous day
    expect(insertedPeople[0].promiseDate.toISOString()).toContain("2026-11-19T18:30:00");

    const mappedPersonId = insertedPeople[0]._id;

    // Verify entriesCol bulk inserted with mappedPersonId
    expect(mockEntriesInsertMany).toHaveBeenCalledTimes(1);
    const insertedEntries = mockEntriesInsertMany.mock.calls[0][0];
    expect(insertedEntries).toHaveLength(1);
    expect(insertedEntries[0].personId).toBe(mappedPersonId);
    expect(insertedEntries[0].dueDate?.toISOString()).toContain("2026-11-19T18:30:00");

    // Verify promisesCol bulk inserted with mappedPersonId and parsed IST date
    expect(mockPromisesInsertMany).toHaveBeenCalledTimes(1);
    const insertedPromises = mockPromisesInsertMany.mock.calls[0][0];
    expect(insertedPromises).toHaveLength(1);
    expect(insertedPromises[0].personId).toBe(mappedPersonId);
    expect(insertedPromises[0].note).toBe("Promise on Friday");
    expect(insertedPromises[0].status).toBe("PENDING");
    expect(insertedPromises[0].promiseDate.toISOString()).toContain("2026-11-19T18:30:00");

    // Verify prompt cache was invalidated
    expect(mockInvalidatePromptCache).toHaveBeenCalledWith("owner-test-1");
  });

  it("updates promiseDate and promiseNote on existing matched contacts", async () => {
    // Contact already exists in DB with matching phone
    mockPeopleFindToArray.mockResolvedValue([
      {
        _id: "existing-person-uuid",
        ownerId: "owner-test-1",
        name: "Ramesh Customer",
        phone: "+91 98765 43210",
      },
    ]);

    const payload = {
      version: "chai_ledger_backup_v2",
      exportedAt: new Date().toISOString(),
      owner: { email: "owner@test.com" },
      people: [
        {
          id: "backup-p-1",
          name: "Ramesh Customer",
          phone: "+91 98765 43210",
          promiseDate: "2026-11-25",
          promiseNote: "Updated promise note",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      entries: [],
      promises: [],
    };

    const res = await restoreBackupJson(JSON.stringify(payload));
    expect(res.ok).toBe(true);

    // Should not insert new person since phone matched
    expect(mockPeopleInsertMany).not.toHaveBeenCalled();

    // Should update existing person with the restored promiseDate and promiseNote
    expect(mockPeopleUpdateOne).toHaveBeenCalledWith(
      { _id: "existing-person-uuid", ownerId: "owner-test-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          promiseNote: "Updated promise note",
        }),
      }),
      expect.anything()
    );
  });

  it("chunks large datasets into 500-item batches to prevent transaction timeouts", async () => {
    // Generate 1,200 entries
    const entries = Array.from({ length: 1200 }, (_, i) => ({
      id: `e-${i}`,
      personId: "p-1",
      type: "GAVE" as const,
      amountCents: 1000,
      note: `Entry ${i}`,
      createdAt: new Date().toISOString(),
    }));

    const payload = {
      version: "chai_ledger_backup_v2",
      exportedAt: new Date().toISOString(),
      owner: { email: "owner@test.com" },
      people: [
        {
          id: "p-1",
          name: "Heavy Customer",
          phone: "9999999999",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      entries,
      promises: [],
    };

    const res = await restoreBackupJson(JSON.stringify(payload));
    expect(res.ok).toBe(true);
    expect(res.count?.entries).toBe(1200);

    // 1200 entries chunked into 500: should be 3 batches (500 + 500 + 200)
    expect(mockEntriesInsertMany).toHaveBeenCalledTimes(3);
    expect(mockEntriesInsertMany.mock.calls[0][0]).toHaveLength(500);
    expect(mockEntriesInsertMany.mock.calls[1][0]).toHaveLength(500);
    expect(mockEntriesInsertMany.mock.calls[2][0]).toHaveLength(200);
  });
});

describe("commitCsvImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "owner-test-1" });
    mockPeopleFindToArray.mockResolvedValue([]);
  });

  it("pins CSV imported due dates to Indian midnight and clears vocabulary prompt cache", async () => {
    const csvContent = [
      "Name,Phone,Type,Amount,Note,DueDate",
      "Vikas Patel,+91 91234 56789,Udhar,150.00,Chai bill,2026-11-20",
    ].join("\n");

    const res = await commitCsvImport(csvContent);
    expect(res.ok).toBe(true);
    expect(res.importedCount).toBe(1);

    // Verify contact was inserted
    expect(mockPeopleInsertMany).toHaveBeenCalledTimes(1);
    const newPersonId = mockPeopleInsertMany.mock.calls[0][0][0]._id;

    // Verify entry was inserted with parsed IST due date (not bare UTC date)
    expect(mockEntriesInsertMany).toHaveBeenCalledTimes(1);
    const insertedEntry = mockEntriesInsertMany.mock.calls[0][0][0];
    expect(insertedEntry.personId).toBe(newPersonId);
    expect(insertedEntry.amountCents).toBe(15000);
    expect(insertedEntry.dueDate).toBeInstanceOf(Date);
    // 2026-11-20 IST midnight is 2026-11-19T18:30:00Z in UTC
    expect(insertedEntry.dueDate.toISOString()).toContain("2026-11-19T18:30:00");

    // Verify vocabulary prompt cache was invalidated for immediate speech recognition
    expect(mockInvalidatePromptCache).toHaveBeenCalledWith("owner-test-1");
  });
});
