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
const mockDeleteOnePerson = vi.fn();
const mockDeleteManyEntries = vi.fn();
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
  }),
  peopleCol: () => ({
    deleteOne: mockDeleteOnePerson,
  }),
  usersCol: () => ({
    updateOne: mockUpdateOneUser,
  }),
  mongoClient: () => ({
    startSession: mockStartSession,
  }),
}));

import { deleteEntry, editEntry } from "@/actions/entries";
import { deletePerson } from "@/actions/people";
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
    mockDeleteOneEntry.mockRejectedValue(new Error("Database connection lost"));

    const fd = new FormData();
    fd.append("entryId", "550e8400-e29b-41d4-a716-446655440000");
    fd.append("personId", "550e8400-e29b-41d4-a716-446655440001");

    await expect(deleteEntry(fd)).resolves.not.toThrow();
    expect(mockDeleteOneEntry).toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("successfully deletes entry and revalidates paths", async () => {
    mockGetOwner.mockResolvedValue("owner-1");
    mockDeleteOneEntry.mockResolvedValue({ deletedCount: 1 });

    const entryId = "550e8400-e29b-41d4-a716-446655440000";
    const personId = "550e8400-e29b-41d4-a716-446655440001";
    const fd = new FormData();
    fd.append("entryId", entryId);
    fd.append("personId", personId);

    await deleteEntry(fd);
    expect(mockDeleteOneEntry).toHaveBeenCalledWith({
      _id: entryId,
      ownerId: "owner-1",
    });
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
    expect(mockDeleteOnePerson).toHaveBeenCalled();
    expect(mockDeleteManyEntries).toHaveBeenCalled();
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
