import { describe, it, expect, vi, beforeEach } from "vitest";
import { signSession, verifyFullSession, verifySession } from "@/lib/auth";
import {
  shopCodeSchema,
  staffCreateSchema,
  staffLoginSchema,
} from "@/lib/validation";

const mockInsertOne = vi.fn();
const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();
const mockDeleteOne = vi.fn();
const mockSession = vi.fn();
const mockStaffFindToArray = vi.fn().mockResolvedValue([]);
const mockStaffInsertOne = vi.fn().mockResolvedValue({ insertedId: "s1" });
const mockUsersFindOne = vi.fn().mockResolvedValue(null);
const mockUsersUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/server/session", () => ({
  getSession: () => mockSession(),
  getOwner: () => mockSession()?.userId ?? null,
}));

vi.mock("@/lib/mongo", () => ({
  entriesCol: () => ({
    insertOne: mockInsertOne,
    findOne: mockFindOne,
    updateOne: mockUpdateOne,
    deleteOne: mockDeleteOne,
  }),
  peopleCol: () => ({
    findOne: vi.fn().mockResolvedValue({ _id: "p1" }),
    updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
  }),
  staffCol: () => ({
    find: () => ({ toArray: mockStaffFindToArray }),
    findOne: mockFindOne,
    insertOne: mockStaffInsertOne,
    updateOne: mockUpdateOne,
    deleteOne: mockDeleteOne,
  }),
  usersCol: () => ({
    findOne: mockUsersFindOne,
    updateOne: mockUsersUpdateOne,
  }),
  mongoClient: () => ({
    startSession: () => ({
      withTransaction: vi.fn(),
      endSession: vi.fn(),
    }),
  }),
}));

describe("Staff Session & JWT Roles", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("signs and verifies owner session", async () => {
    const token = await signSession("owner-uuid-1");
    const verified = await verifyFullSession(token);
    expect(verified).toEqual({
      userId: "owner-uuid-1",
      role: "OWNER",
      staffId: undefined,
      staffName: undefined,
    });

    // Backwards-compatible verifySession returns owner ID
    expect(await verifySession(token)).toBe("owner-uuid-1");
  });

  it("signs and verifies staff session with attribution claims", async () => {
    const token = await signSession({
      userId: "owner-uuid-1",
      role: "STAFF",
      staffId: "staff-uuid-9",
      staffName: "Ramesh Munim",
    });

    const verified = await verifyFullSession(token);
    expect(verified).toEqual({
      userId: "owner-uuid-1",
      role: "STAFF",
      staffId: "staff-uuid-9",
      staffName: "Ramesh Munim",
    });

    // Database queries still isolate by shop owner
    expect(await verifySession(token)).toBe("owner-uuid-1");
  });
});

describe("Staff Validation Schemas", () => {
  it("validates staff login schema", () => {
    expect(
      staffLoginSchema.safeParse({ shopIdentifier: "CHAI-101", pin: "1234" }).success
    ).toBe(true);

    // Non-4-digit PIN rejected
    expect(
      staffLoginSchema.safeParse({ shopIdentifier: "CHAI-101", pin: "123" }).success
    ).toBe(false);
    expect(
      staffLoginSchema.safeParse({ shopIdentifier: "CHAI-101", pin: "12345" }).success
    ).toBe(false);
    expect(
      staffLoginSchema.safeParse({ shopIdentifier: "CHAI-101", pin: "abcd" }).success
    ).toBe(false);

    // Empty shop identifier rejected
    expect(
      staffLoginSchema.safeParse({ shopIdentifier: "   ", pin: "1234" }).success
    ).toBe(false);
  });

  it("validates staff creation schema", () => {
    expect(
      staffCreateSchema.safeParse({ name: "Suresh", pin: "9988", phone: "9876543210" }).success
    ).toBe(true);

    expect(
      staffCreateSchema.safeParse({ name: "S", pin: "9988" }).success
    ).toBe(false);
  });

  it("validates shop code schema", () => {
    expect(shopCodeSchema.safeParse({ shopCode: "KIRANA-1" }).success).toBe(true);
    expect(shopCodeSchema.safeParse({ shopCode: "CHAI" }).success).toBe(true);
    expect(shopCodeSchema.safeParse({ shopCode: "AB" }).success).toBe(false); // too short
  });
});

describe("Staff RBAC & Add-Only Protections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("strictly prevents staff from editing entries", async () => {
    const { editEntry } = await import("@/actions/entries");

    // Mock staff session
    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "STAFF",
      staffId: "staff-1",
      staffName: "Suresh",
    });

    mockFindOne.mockResolvedValue({
      _id: "e1",
      personId: "p1",
      createdAt: new Date(),
      createdBy: { role: "STAFF", staffId: "staff-1", staffName: "Suresh" },
    });

    const fd = new FormData();
    fd.append("id", "550e8400-e29b-41d4-a716-446655440000");
    fd.append("type", "GAVE");
    fd.append("amount", "150");

    const res = await editEntry({}, fd);
    expect(res.error).toBe(
      "Staff cannot edit entries. Only shop owners can modify transactions."
    );
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("strictly prevents staff from creating new customers", async () => {
    const { createPerson } = await import("@/actions/people");

    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "STAFF",
      staffId: "staff-1",
      staffName: "Suresh",
    });

    const fd = new FormData();
    fd.append("name", "New Walk-in Customer");
    fd.append("phone", "9876543210");

    const res = await createPerson({}, fd);
    expect(res.error).toBe(
      "Staff cannot add customers. Only shop owners can create contacts."
    );
  });

  it("strictly prevents staff from recording or setting reminders and promises", async () => {
    const { recordReminder, setPromiseToPay, clearPromiseToPay } = await import(
      "@/actions/reminders"
    );

    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "STAFF",
      staffId: "staff-1",
      staffName: "Suresh",
    });

    const resRemind = await recordReminder("550e8400-e29b-41d4-a716-446655440000");
    expect(resRemind.error).toBe("Staff cannot record reminders.");

    const fdPromise = new FormData();
    fdPromise.append("personId", "550e8400-e29b-41d4-a716-446655440000");
    fdPromise.append("promiseDate", "2026-11-20");

    const resSet = await setPromiseToPay({}, fdPromise);
    expect(resSet.error).toBe("Staff cannot set promises.");

    const resClear = await clearPromiseToPay({}, fdPromise);
    expect(resClear.error).toBe("Staff cannot clear promises.");
  });

  it("strictly prevents staff from accessing backup and profile operations", async () => {
    const { exportBackupJson } = await import("@/actions/backup");
    const { updateOwnerUpi } = await import("@/actions/profile");

    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "STAFF",
      staffId: "staff-1",
      staffName: "Suresh",
    });

    const resExport = await exportBackupJson();
    expect(resExport.error).toBe("Staff cannot export backups.");

    const fdUpi = new FormData();
    fdUpi.append("upiId", "owner@upi");

    const resUpi = await updateOwnerUpi({}, fdUpi);
    expect(resUpi.error).toBe("Staff cannot update shop profile settings.");
  });

  it("strictly prevents staff from deleting entries", async () => {
    const { deleteEntry } = await import("@/actions/entries");

    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "STAFF",
      staffId: "staff-1",
      staffName: "Suresh",
    });

    const fd = new FormData();
    fd.append("entryId", "550e8400-e29b-41d4-a716-446655440000");
    fd.append("personId", "550e8400-e29b-41d4-a716-446655440001");

    await deleteEntry(fd);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("strictly prevents staff from deleting customers", async () => {
    const { deletePerson } = await import("@/actions/people");

    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "STAFF",
      staffId: "staff-1",
      staffName: "Suresh",
    });

    const fd = new FormData();
    fd.append("id", "550e8400-e29b-41d4-a716-446655440000");

    await deletePerson(fd);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("strictly prevents staff from restoring or emptying trash", async () => {
    const { restorePerson, emptyTrash } = await import("@/actions/trash");

    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "STAFF",
      staffId: "staff-1",
      staffName: "Suresh",
    });

    const fd = new FormData();
    fd.append("id", "550e8400-e29b-41d4-a716-446655440000");

    const resRestore = await restorePerson({}, fd);
    expect(resRestore.error).toBe(
      "Staff accounts cannot access trash operations."
    );

    const resEmpty = await emptyTrash();
    expect(resEmpty.error).toBe(
      "Staff accounts cannot access trash operations."
    );
  });
});

describe("Staff Management & Collision Protections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects staff creation when an active clerk already uses that PIN", async () => {
    const { createStaff } = await import("@/actions/staff");
    const { hash } = await import("bcryptjs");

    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "OWNER",
    });

    const existingPinHash = await hash("1234", 10);
    mockStaffFindToArray.mockResolvedValue([
      { pinHash: existingPinHash, isActive: true },
    ]);

    const fd = new FormData();
    fd.append("name", "New Clerk");
    fd.append("pin", "1234");

    const res = await createStaff({}, fd);
    expect(res.error).toBe(
      "An active staff member in your shop already uses this PIN. Please choose another PIN."
    );
    expect(mockStaffInsertOne).not.toHaveBeenCalled();
  });

  it("handles race condition E11000 duplicate key on shopCode update gracefully", async () => {
    const { updateShopCode } = await import("@/actions/staff");

    mockSession.mockResolvedValue({
      userId: "owner-1",
      role: "OWNER",
    });

    mockUsersFindOne.mockResolvedValue(null);
    const err = new Error("E11000 duplicate key error collection");
    // @ts-expect-error mongo error code convention
    err.code = 11000;
    mockUsersUpdateOne.mockRejectedValue(err);

    const fd = new FormData();
    fd.append("shopCode", "KIRANA-1");

    const res = await updateShopCode({}, fd);
    expect(res.error).toBe(
      "This shop code was just taken by another store. Try another."
    );
  });

  it("locks out staff login after 5 consecutive failed attempts", async () => {
    const { loginStaff, resetStaffLoginAttempts } = await import("@/actions/auth");
    const testShop = "TEST-LOCKOUT-SHOP";
    await resetStaffLoginAttempts(testShop);

    // Mock shop owner exists but staff has different PIN
    mockUsersFindOne.mockResolvedValue({ _id: "owner-123" });
    mockStaffFindToArray.mockResolvedValue([
      { _id: "staff-1", name: "Clerk", pinHash: "$2a$10$invalidhashhere", isActive: true },
    ]);

    // Attempts 1 to 4 should return remaining attempts
    for (let i = 1; i <= 4; i++) {
      const fd = new FormData();
      fd.append("shopIdentifier", testShop);
      fd.append("pin", "9999");
      const res = await loginStaff({}, fd);
      expect(res.error).toContain(`${5 - i} attempt`);
    }

    // 5th attempt locks the shop
    const fd5 = new FormData();
    fd5.append("shopIdentifier", testShop);
    fd5.append("pin", "9999");
    const res5 = await loginStaff({}, fd5);
    expect(res5.error).toContain("This shop login is locked for 15 minutes");

    // 6th attempt is blocked immediately by lockout
    const res6 = await loginStaff({}, fd5);
    expect(res6.error).toContain("Too many failed attempts. Login is locked for");

    // Resetting clears the lock
    await resetStaffLoginAttempts(testShop);
    const resAfterReset = await loginStaff({}, fd5);
    expect(resAfterReset.error).toContain("4 attempts left");
  });
});
