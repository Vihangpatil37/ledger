import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetOwner = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  // @ts-expect-error next.js redirect convention
  err.digest = `NEXT_REDIRECT;replace;${url};307;;`;
  throw err;
});
const mockRevalidatePath = vi.fn();

const mockDeleteOneEntry = vi.fn();
const mockFindOneEntry = vi.fn();
const mockUpdateOneEntry = vi.fn();
const mockInsertOneEntry = vi.fn();
const mockDeleteOnePerson = vi.fn();
const mockFindOnePerson = vi.fn();
const mockInsertOnePerson = vi.fn();
const mockUpdateOnePerson = vi.fn();
const mockDeleteManyEntries = vi.fn();
const mockUpdateManyEntries = vi.fn();
const mockUpdateOneUser = vi.fn();

const mockWithTransaction = vi.fn();
const mockEndSession = vi.fn();
const mockStartSession = vi.fn();

vi.mock("@/server/session", () => ({
  getOwner: () => mockGetOwner(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

vi.mock("@/lib/mongo", () => ({
  entriesCol: () => ({
    deleteOne: mockDeleteOneEntry,
    deleteMany: mockDeleteManyEntries,
    findOne: mockFindOneEntry,
    updateOne: mockUpdateOneEntry,
    updateMany: mockUpdateManyEntries,
    insertOne: mockInsertOneEntry,
  }),
  peopleCol: () => ({
    deleteOne: mockDeleteOnePerson,
    findOne: mockFindOnePerson,
    insertOne: mockInsertOnePerson,
    updateOne: mockUpdateOnePerson,
  }),
  usersCol: () => ({
    updateOne: mockUpdateOneUser,
  }),
  mongoClient: () => ({
    startSession: mockStartSession,
  }),
}));

import { addEntry, deleteEntry, editEntry } from "@/actions/entries";
import { createPerson, deletePerson, updatePerson } from "@/actions/people";
import { updateOwnerUpi } from "@/actions/profile";

describe("deleteEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("redirects to /login when user is not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("entryId", "550e8400-e29b-41d4-a716-446655440000");
    fd.append("personId", "550e8400-e29b-41d4-a716-446655440001");

    await expect(deleteEntry(fd)).rejects.toThrow("NEXT_REDIRECT: /login");
    expect(mockDeleteOneEntry).not.toHaveBeenCalled();
  });

  it("does not redirect authenticated user to /login on invalid id validation failure", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const fd = new FormData();
    fd.append("entryId", "invalid-id");
    fd.append("personId", "not-a-uuid");

    await deleteEntry(fd);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockDeleteOneEntry).not.toHaveBeenCalled();
  });

  it("handles database deletion errors gracefully without throwing", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockUpdateOneEntry.mockRejectedValue(new Error("Database connection lost"));

    const fd = new FormData();
    fd.append("entryId", "550e8400-e29b-41d4-a716-446655440000");
    fd.append("personId", "550e8400-e29b-41d4-a716-446655440001");

    await expect(deleteEntry(fd)).resolves.not.toThrow();
    expect(mockUpdateOneEntry).toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("successfully soft-deletes entry and revalidates paths", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockUpdateOneEntry.mockResolvedValue({ modifiedCount: 1 });

    const entryId = "550e8400-e29b-41d4-a716-446655440000";
    const personId = "550e8400-e29b-41d4-a716-446655440001";
    const fd = new FormData();
    fd.append("entryId", entryId);
    fd.append("personId", personId);

    await deleteEntry(fd);
    expect(mockUpdateOneEntry).toHaveBeenCalledWith(
      {
        _id: entryId,
        ownerId: "owner-1",
      },
      expect.objectContaining({
        $set: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/people/${personId}`);
  });
});

describe("editEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns error if user is not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("id", "550e8400-e29b-41d4-a716-446655440000");
    fd.append("type", "GAVE");
    fd.append("amount", "250.00");

    const res = await editEntry({}, fd);
    expect(res.error).toBe("Please sign in again.");
    expect(mockUpdateOneEntry).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid input", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const fd = new FormData();
    fd.append("id", "invalid-id");
    fd.append("type", "INVALID_TYPE");
    fd.append("amount", "-50");

    const res = await editEntry({}, fd);
    expect(res.fieldErrors).toBeDefined();
    expect(mockUpdateOneEntry).not.toHaveBeenCalled();
  });

  it("returns error if entry is not found for this owner", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockFindOneEntry.mockResolvedValue(null);

    const fd = new FormData();
    fd.append("id", "550e8400-e29b-41d4-a716-446655440000");
    fd.append("type", "GAVE");
    fd.append("amount", "250.00");

    const res = await editEntry({}, fd);
    expect(res.error).toBe("Entry not found.");
    expect(mockUpdateOneEntry).not.toHaveBeenCalled();
  });

  it("successfully updates entry, sets editedAt, clears dueDate if RECEIVED, and revalidates paths", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const entryId = "550e8400-e29b-41d4-a716-446655440000";
    const personId = "550e8400-e29b-41d4-a716-446655440001";
    mockFindOneEntry.mockResolvedValue({ _id: entryId, personId });
    mockUpdateOneEntry.mockResolvedValue({ matchedCount: 1 });

    const fd = new FormData();
    fd.append("id", entryId);
    fd.append("type", "RECEIVED");
    fd.append("amount", "350.50");
    fd.append("note", "Returned half");
    fd.append("dueDate", "2026-12-01"); // Should be ignored/cleared because type is RECEIVED

    const res = await editEntry({}, fd);
    expect(res.ok).toBe(true);

    expect(mockUpdateOneEntry).toHaveBeenCalledWith(
      { _id: entryId, ownerId: "owner-1" },
      {
        $set: {
          type: "RECEIVED",
          amountCents: 35050,
          note: "Returned half",
          dueDate: null, // cleared
          editedAt: expect.any(Date),
        },
      }
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/people/${personId}`);
  });
});

describe("deletePerson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockStartSession.mockReturnValue({
      withTransaction: mockWithTransaction,
      endSession: mockEndSession,
    });
  });

  it("redirects to /login when user is not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("id", "550e8400-e29b-41d4-a716-446655440000");

    await expect(deletePerson(fd)).rejects.toThrow("NEXT_REDIRECT: /login");
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it("does not redirect authenticated user to /login on invalid id validation failure", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const fd = new FormData();
    fd.append("id", "invalid-id");

    await deletePerson(fd);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it("handles transaction errors gracefully and ensures endSession is always called", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockWithTransaction.mockRejectedValue(new Error("Transaction aborted"));

    const fd = new FormData();
    fd.append("id", "550e8400-e29b-41d4-a716-446655440000");

    await expect(deletePerson(fd)).resolves.not.toThrow();
    expect(mockEndSession).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalledWith("/");
  });

  it("successfully commits transaction, ends session, revalidates and redirects to /", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockWithTransaction.mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
    });

    const personId = "550e8400-e29b-41d4-a716-446655440000";
    const fd = new FormData();
    fd.append("id", personId);

    await expect(deletePerson(fd)).rejects.toThrow("NEXT_REDIRECT: /");
    expect(mockWithTransaction).toHaveBeenCalled();
    expect(mockUpdateOnePerson).toHaveBeenCalled();
    expect(mockUpdateManyEntries).toHaveBeenCalled();
    expect(mockEndSession).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("updateOwnerUpi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error if user is not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("upiId", "merchant@upi");

    const res = await updateOwnerUpi({}, fd);
    expect(res.error).toBe("Please sign in again.");
    expect(mockUpdateOneUser).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid UPI handle format", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const fd = new FormData();
    fd.append("upiId", "invalid-handle-no-at");

    const res = await updateOwnerUpi({}, fd);
    expect(res.fieldErrors?.upiId).toBeDefined();
    expect(mockUpdateOneUser).not.toHaveBeenCalled();
  });

  it("successfully updates owner UPI and revalidates /settings", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockUpdateOneUser.mockResolvedValue({ matchedCount: 1 });

    const fd = new FormData();
    fd.append("upiId", "store@okhdfcbank");
    fd.append("upiName", "Ramesh General Store");

    const res = await updateOwnerUpi({}, fd);
    expect(res.ok).toBe(true);

    expect(mockUpdateOneUser).toHaveBeenCalledWith(
      { _id: "owner-1" },
      {
        $set: {
          upiId: "store@okhdfcbank",
          upiName: "Ramesh General Store",
        },
      }
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("addEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("personId", "550e8400-e29b-41d4-a716-446655440001");
    fd.append("type", "GAVE");
    fd.append("amount", "100.00");

    const res = await addEntry({}, fd);
    expect(res.error).toBe("Please sign in again.");
    expect(mockInsertOneEntry).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid schema input", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const fd = new FormData();
    fd.append("personId", "not-a-uuid");
    fd.append("type", "INVALID");
    fd.append("amount", "0");

    const res = await addEntry({}, fd);
    expect(res.fieldErrors).toBeDefined();
    expect(mockInsertOneEntry).not.toHaveBeenCalled();
  });

  it("returns error if person does not belong to owner", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockFindOnePerson.mockResolvedValue(null);

    const fd = new FormData();
    fd.append("personId", "550e8400-e29b-41d4-a716-446655440001");
    fd.append("type", "GAVE");
    fd.append("amount", "100.00");

    const res = await addEntry({}, fd);
    expect(res.error).toBe("Person not found.");
    expect(mockInsertOneEntry).not.toHaveBeenCalled();
  });

  it("inserts GAVE entry with paise and dueDate and revalidates paths", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const personId = "550e8400-e29b-41d4-a716-446655440001";
    mockFindOnePerson.mockResolvedValue({ _id: personId });
    mockInsertOneEntry.mockResolvedValue({ insertedId: "entry-1" });

    const fd = new FormData();
    fd.append("personId", personId);
    fd.append("type", "GAVE");
    fd.append("amount", "250.50");
    fd.append("note", "Tea and snacks");
    fd.append("dueDate", "2026-12-01");

    const res = await addEntry({}, fd);
    expect(res.ok).toBe(true);

    expect(mockInsertOneEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "owner-1",
        personId,
        type: "GAVE",
        amountCents: 25050,
        note: "Tea and snacks",
        dueDate: expect.any(Date),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/people/${personId}`);
  });

  it("clears dueDate to null when type is RECEIVED even if dueDate was provided", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const personId = "550e8400-e29b-41d4-a716-446655440001";
    mockFindOnePerson.mockResolvedValue({ _id: personId });
    mockInsertOneEntry.mockResolvedValue({ insertedId: "entry-2" });

    const fd = new FormData();
    fd.append("personId", personId);
    fd.append("type", "RECEIVED");
    fd.append("amount", "100.00");
    fd.append("dueDate", "2026-12-01");

    const res = await addEntry({}, fd);
    expect(res.ok).toBe(true);

    expect(mockInsertOneEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "owner-1",
        personId,
        type: "RECEIVED",
        amountCents: 10000,
        dueDate: null,
      })
    );
  });

  it("catches database errors and returns friendly error state", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const personId = "550e8400-e29b-41d4-a716-446655440001";
    mockFindOnePerson.mockResolvedValue({ _id: personId });
    mockInsertOneEntry.mockRejectedValue(new Error("Connection reset"));

    const fd = new FormData();
    fd.append("personId", personId);
    fd.append("type", "GAVE");
    fd.append("amount", "50.00");

    const res = await addEntry({}, fd);
    expect(res.error).toBe("Could not save entry. Try again.");
  });
});

describe("createPerson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("name", "Ramesh");

    const res = await createPerson({}, fd);
    expect(res.error).toBe("Please sign in again.");
    expect(mockInsertOnePerson).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid name or phone", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const fd = new FormData();
    fd.append("name", "");
    fd.append("phone", "123");

    const res = await createPerson({}, fd);
    expect(res.fieldErrors?.name).toBeDefined();
    expect(res.fieldErrors?.phone).toBeDefined();
    expect(mockInsertOnePerson).not.toHaveBeenCalled();
  });

  it("inserts person, revalidates / and redirects to /", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockInsertOnePerson.mockResolvedValue({ insertedId: "person-1" });

    const fd = new FormData();
    fd.append("name", "Ramesh Kumar");
    fd.append("phone", "+91 98765 43210");

    await expect(createPerson({}, fd)).rejects.toThrow("NEXT_REDIRECT: /");
    expect(mockInsertOnePerson).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "owner-1",
        name: "Ramesh Kumar",
        phone: "+91 98765 43210",
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
  });

  it("catches DB errors on insertion gracefully", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockInsertOnePerson.mockRejectedValue(new Error("DB error"));

    const fd = new FormData();
    fd.append("name", "Ramesh");

    const res = await createPerson({}, fd);
    expect(res.error).toBe("Could not save. Try again.");
  });
});

describe("updatePerson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockGetOwner.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("id", "550e8400-e29b-41d4-a716-446655440001");
    fd.append("name", "Updated Name");

    const res = await updatePerson({}, fd);
    expect(res.error).toBe("Please sign in again.");
  });

  it("returns error when id is invalid or not found", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    const fd = new FormData();
    fd.append("id", "not-a-uuid");
    fd.append("name", "Updated Name");

    const res = await updatePerson({}, fd);
    expect(res.error).toBe("Person not found.");
  });

  it("returns error when person does not belong to owner (matchedCount === 0)", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockUpdateOnePerson.mockResolvedValue({ matchedCount: 0 });

    const fd = new FormData();
    const id = "550e8400-e29b-41d4-a716-446655440001";
    fd.append("id", id);
    fd.append("name", "Updated Name");

    const res = await updatePerson({}, fd);
    expect(res.error).toBe("Person not found.");
  });

  it("successfully updates person, revalidates paths and returns ok: true", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockUpdateOnePerson.mockResolvedValue({ matchedCount: 1 });

    const id = "550e8400-e29b-41d4-a716-446655440001";
    const fd = new FormData();
    fd.append("id", id);
    fd.append("name", "Ramesh Patel");
    fd.append("phone", "+91 98765 43210");

    const res = await updatePerson({}, fd);
    expect(res.ok).toBe(true);
    expect(mockUpdateOnePerson).toHaveBeenCalledWith(
      { _id: id, ownerId: "owner-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          name: "Ramesh Patel",
          phone: "+91 98765 43210",
        }),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/people/${id}`);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/people/${id}/edit`);
  });
});
