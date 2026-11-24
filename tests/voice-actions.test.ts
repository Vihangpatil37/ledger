import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockRevalidatePath = vi.fn();
const mockPeopleFind = vi.fn();
const mockPeopleFindOne = vi.fn();
const mockPeopleInsertOne = vi.fn();
const mockPeopleUpdateOne = vi.fn();
const mockEntriesInsertOne = vi.fn();
const mockPromisesUpdateMany = vi.fn();

vi.mock("@/server/session", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

vi.mock("@/lib/mongo", () => ({
  peopleCol: () => ({
    find: mockPeopleFind,
    findOne: mockPeopleFindOne,
    insertOne: mockPeopleInsertOne,
    updateOne: mockPeopleUpdateOne,
  }),
  entriesCol: () => ({
    insertOne: mockEntriesInsertOne,
  }),
  promisesCol: () => ({
    updateMany: mockPromisesUpdateMany,
  }),
}));

import { parseVoiceEntry, confirmVoiceEntry } from "@/actions/voice";

describe("Voice Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseVoiceEntry", () => {
    it("returns error if unauthenticated", async () => {
      mockGetSession.mockResolvedValue(null);
      const res = await parseVoiceEntry("Ramesh 50 udhar");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("sign in");
      }
    });

    it("matches existing multi-word customer with database-first priority (Vikram Mehta)", async () => {
      mockGetSession.mockResolvedValue({ userId: "owner-1" });
      const mockSort = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: "p-vm", name: "Vikram Mehta", phone: "9876543210" },
          { _id: "p-rk", name: "Ramesh Kumar", phone: "9876543211" },
        ]),
      });
      mockPeopleFind.mockReturnValue({
        sort: mockSort,
      });

      const res = await parseVoiceEntry("Vikram Mehta ne mere ko 5000 rupees diye");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.proposal.parsed.type).toBe("RECEIVED");
        expect(res.proposal.parsed.amount).toBe(5000);
        expect(res.proposal.isNewPerson).toBe(false);
        expect(res.proposal.matchedPerson?.id).toBe("p-vm");
        expect(res.proposal.matchedPerson?.name).toBe("Vikram Mehta");
      }
    });

    it("returns null matchedPerson and list of all customers when no matching customer found", async () => {
      mockGetSession.mockResolvedValue({ userId: "owner-1" });
      const mockSort = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: "p-1", name: "Ramesh Kumar", phone: "9876543210" },
        ]),
      });
      mockPeopleFind.mockReturnValue({
        sort: mockSort,
      });

      const res = await parseVoiceEntry("Unknown Person 500 jama mila");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.proposal.parsed.type).toBe("RECEIVED");
        expect(res.proposal.parsed.amount).toBe(500);
        expect(res.proposal.isNewPerson).toBe(false);
        expect(res.proposal.matchedPerson).toBeNull();
        expect(res.proposal.allCustomers.length).toBe(1);
      }
    });
  });

  describe("confirmVoiceEntry", () => {
    it("fails if unauthorized", async () => {
      mockGetSession.mockResolvedValue(null);
      const res = await confirmVoiceEntry({
        personId: "p-1",
        type: "GAVE",
        amount: 50,
      });
      expect(res.error).toBe("Please sign in again.");
    });

    it("confirms entry for existing person", async () => {
      mockGetSession.mockResolvedValue({ userId: "owner-1" });
      mockPeopleFindOne.mockResolvedValue({ _id: "p-1" });
      mockEntriesInsertOne.mockResolvedValue({ acknowledged: true });

      const res = await confirmVoiceEntry({
        personId: "p-1",
        type: "GAVE",
        amount: "50",
        note: "2 chai",
      });

      expect(res.ok).toBe(true);
      expect(res.personId).toBe("p-1");
      expect(mockEntriesInsertOne).toHaveBeenCalledTimes(1);
      expect(mockEntriesInsertOne.mock.calls[0][0].amountCents).toBe(5000);
      expect(mockEntriesInsertOne.mock.calls[0][0].type).toBe("GAVE");
      expect(mockEntriesInsertOne.mock.calls[0][0].note).toBe("2 chai");
      expect(mockPromisesUpdateMany).not.toHaveBeenCalled();
      expect(mockPeopleUpdateOne).not.toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    });

    it("resolves pending customer promises and resets promiseDate on customer doc when type is RECEIVED", async () => {
      mockGetSession.mockResolvedValue({ userId: "owner-1" });
      mockPeopleFindOne.mockResolvedValue({ _id: "p-1" });
      mockEntriesInsertOne.mockResolvedValue({ acknowledged: true });
      mockPromisesUpdateMany.mockResolvedValue({ acknowledged: true });
      mockPeopleUpdateOne.mockResolvedValue({ acknowledged: true });

      const res = await confirmVoiceEntry({
        personId: "p-1",
        type: "RECEIVED",
        amount: "500",
        note: "settlement",
      });

      expect(res.ok).toBe(true);
      expect(res.personId).toBe("p-1");
      expect(mockEntriesInsertOne).toHaveBeenCalledTimes(1);
      expect(mockEntriesInsertOne.mock.calls[0][0].amountCents).toBe(50000);
      expect(mockEntriesInsertOne.mock.calls[0][0].type).toBe("RECEIVED");

      expect(mockPromisesUpdateMany).toHaveBeenCalledTimes(1);
      expect(mockPromisesUpdateMany).toHaveBeenCalledWith(
        { personId: "p-1", ownerId: "owner-1", status: "PENDING" },
        { $set: { status: "KEPT", resolvedAt: expect.any(Date) } }
      );

      expect(mockPeopleUpdateOne).toHaveBeenCalledTimes(1);
      expect(mockPeopleUpdateOne).toHaveBeenCalledWith(
        { _id: "p-1", ownerId: "owner-1" },
        { $set: { promiseDate: null, promiseNote: null } }
      );

      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/people/p-1");
    });

    it("strictly rejects creating a new customer via voice", async () => {
      mockGetSession.mockResolvedValue({ userId: "owner-1" });

      const res = await confirmVoiceEntry({
        type: "RECEIVED",
        amount: 150,
        note: "cash payment",
      });

      expect(res.error).toContain("existing customers");
      expect(mockPeopleInsertOne).not.toHaveBeenCalled();
      expect(mockEntriesInsertOne).not.toHaveBeenCalled();
    });
  });
});
