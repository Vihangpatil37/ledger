import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockRevalidatePath = vi.fn();

const mockPeopleUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
const mockPeopleDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
const mockPeopleDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 1 });

const mockEntriesUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
const mockEntriesUpdateMany = vi.fn().mockResolvedValue({ matchedCount: 1 });
const mockEntriesDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
const mockEntriesDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 1 });

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

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/mongo", () => ({
  peopleCol: () => ({
    updateOne: mockPeopleUpdateOne,
    deleteOne: mockPeopleDeleteOne,
    deleteMany: mockPeopleDeleteMany,
  }),
  entriesCol: () => ({
    updateOne: mockEntriesUpdateOne,
    updateMany: mockEntriesUpdateMany,
    deleteOne: mockEntriesDeleteOne,
    deleteMany: mockEntriesDeleteMany,
  }),
  mongoClient: () => ({
    startSession: mockStartSession,
  }),
}));

import {
  restorePerson,
  restoreEntry,
  purgeTrashItem,
  emptyTrash,
} from "@/actions/trash";

describe("Polymorphic Trash Actions (R5)", () => {
  const TEST_OWNER = "owner-trash-test";
  const PERSON_ID = "550e8400-e29b-41d4-a716-446655440000";
  const ENTRY_ID = "660e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: TEST_OWNER });
  });

  describe("restorePerson", () => {
    it("handles direct form action submission: restorePerson(formData)", async () => {
      const fd = new FormData();
      fd.append("id", PERSON_ID);

      await restorePerson(fd);

      expect(mockPeopleUpdateOne).toHaveBeenCalledWith(
        { _id: PERSON_ID, ownerId: TEST_OWNER },
        { $set: { deletedAt: null } },
        expect.anything()
      );
      expect(mockEntriesUpdateMany).toHaveBeenCalledWith(
        { personId: PERSON_ID, ownerId: TEST_OWNER },
        { $set: { deletedAt: null } },
        expect.anything()
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/trash");
    });

    it("handles hook invocation: restorePerson(previousState, formData)", async () => {
      const fd = new FormData();
      fd.append("id", PERSON_ID);

      const res = await restorePerson({}, fd);
      expect(res).toEqual({ ok: true });
      expect(mockPeopleUpdateOne).toHaveBeenCalled();
    });
  });

  describe("restoreEntry", () => {
    it("handles direct form action submission: restoreEntry(formData)", async () => {
      const fd = new FormData();
      fd.append("entryId", ENTRY_ID);
      fd.append("personId", PERSON_ID);

      await restoreEntry(fd);

      expect(mockPeopleUpdateOne).toHaveBeenCalledWith(
        { _id: PERSON_ID, ownerId: TEST_OWNER },
        { $set: { deletedAt: null } },
        expect.anything()
      );
      expect(mockEntriesUpdateOne).toHaveBeenCalledWith(
        { _id: ENTRY_ID, ownerId: TEST_OWNER },
        { $set: { deletedAt: null } },
        expect.anything()
      );
    });

    it("handles hook invocation: restoreEntry(previousState, formData)", async () => {
      const fd = new FormData();
      fd.append("entryId", ENTRY_ID);
      fd.append("personId", PERSON_ID);

      const res = await restoreEntry({}, fd);
      expect(res).toEqual({ ok: true });
    });
  });

  describe("purgeTrashItem", () => {
    it("handles direct form action: purgeTrashItem(formData) for PERSON", async () => {
      const fd = new FormData();
      fd.append("id", PERSON_ID);
      fd.append("kind", "PERSON");

      await purgeTrashItem(fd);

      expect(mockPeopleDeleteOne).toHaveBeenCalledWith(
        { _id: PERSON_ID, ownerId: TEST_OWNER },
        expect.anything()
      );
      expect(mockEntriesDeleteMany).toHaveBeenCalledWith(
        { personId: PERSON_ID, ownerId: TEST_OWNER },
        expect.anything()
      );
    });

    it("handles direct form action: purgeTrashItem(formData) for ENTRY", async () => {
      const fd = new FormData();
      fd.append("id", ENTRY_ID);
      fd.append("kind", "ENTRY");

      await purgeTrashItem(fd);

      expect(mockEntriesDeleteOne).toHaveBeenCalledWith({
        _id: ENTRY_ID,
        ownerId: TEST_OWNER,
      });
    });
  });

  describe("emptyTrash", () => {
    it("handles form action with formData: emptyTrash(formData)", async () => {
      const fd = new FormData();
      await emptyTrash(fd);

      expect(mockPeopleDeleteMany).toHaveBeenCalledWith(
        { ownerId: TEST_OWNER, deletedAt: { $ne: null } },
        expect.anything()
      );
      expect(mockEntriesDeleteMany).toHaveBeenCalledWith(
        { ownerId: TEST_OWNER, deletedAt: { $ne: null } },
        expect.anything()
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/trash");
    });

    it("handles programmatic call: emptyTrash()", async () => {
      const res = await emptyTrash();
      expect(res).toEqual({ ok: true });
      expect(mockPeopleDeleteMany).toHaveBeenCalled();
    });
  });
});
