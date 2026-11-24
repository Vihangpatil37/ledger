import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetOwner = vi.fn();
const mockFindOnePerson = vi.fn();
const mockUpdateOnePerson = vi.fn();
const mockUpdateManyPromises = vi.fn();
const mockInsertOnePromise = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/server/session", () => ({
  getOwner: () => mockGetOwner(),
  getSession: async () => {
    const owner = await mockGetOwner();
    return owner ? { userId: owner } : null;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

vi.mock("@/lib/mongo", () => ({
  peopleCol: () => ({
    findOne: mockFindOnePerson,
    updateOne: mockUpdateOnePerson,
  }),
  promisesCol: () => ({
    updateMany: mockUpdateManyPromises,
    insertOne: mockInsertOnePromise,
  }),
}));

import { setPromiseToPay, clearPromiseToPay } from "@/actions/reminders";

describe("setPromiseToPay and clearPromiseToPay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOwner.mockResolvedValue("owner-test-1");
  });

  it("updates existing pending promises to RESCHEDULED before inserting a new promise record", async () => {
    const personId = "550e8400-e29b-41d4-a716-446655440000";
    mockFindOnePerson.mockResolvedValue({ _id: personId, ownerId: "owner-test-1" });
    mockUpdateOnePerson.mockResolvedValue({ matchedCount: 1 });
    mockUpdateManyPromises.mockResolvedValue({ modifiedCount: 1 });
    mockInsertOnePromise.mockResolvedValue({ acknowledged: true });

    const fd = new FormData();
    fd.append("personId", personId);
    fd.append("promiseDate", "2026-12-05");
    fd.append("note", "Will pay next week");

    const res = await setPromiseToPay({}, fd);

    expect(res.ok).toBe(true);

    // Assert updateMany marked prior pending promises as RESCHEDULED
    expect(mockUpdateManyPromises).toHaveBeenCalledWith(
      { personId, ownerId: "owner-test-1", status: "PENDING" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "RESCHEDULED",
        }),
      })
    );

    // Assert insertOne inserted new pending promise record
    expect(mockInsertOnePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "owner-test-1",
        personId,
        status: "PENDING",
        note: "Will pay next week",
      })
    );
  });

  it("marks pending promises as RESCHEDULED when clearing promise", async () => {
    const personId = "550e8400-e29b-41d4-a716-446655440000";
    mockUpdateOnePerson.mockResolvedValue({ matchedCount: 1 });
    mockUpdateManyPromises.mockResolvedValue({ modifiedCount: 1 });

    const fd = new FormData();
    fd.append("personId", personId);

    const res = await clearPromiseToPay({}, fd);
    expect(res.ok).toBe(true);
    expect(mockUpdateManyPromises).toHaveBeenCalledWith(
      { personId, ownerId: "owner-test-1", status: "PENDING" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "RESCHEDULED",
        }),
      })
    );
  });
});
