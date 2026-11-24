import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// --- Mocks Setup ---
const mockSession = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  // @ts-expect-error next.js redirect convention
  err.digest = `NEXT_REDIRECT;replace;${url};307;;`;
  throw err;
});

const mockEntriesFindOne = vi.fn();
const mockEntriesFindToArray = vi.fn().mockResolvedValue([]);
const mockEntriesInsertOne = vi.fn().mockResolvedValue({ insertedId: "entry-1" });
const mockEntriesInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 });
const mockEntriesUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
const mockEntriesUpdateMany = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
const mockEntriesDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
const mockEntriesDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 1 });
const mockEntriesAggregateToArray = vi.fn().mockResolvedValue([]);

const mockPeopleFindOne = vi.fn();
const mockPeopleFindToArray = vi.fn().mockResolvedValue([]);
const mockPeopleInsertOne = vi.fn().mockResolvedValue({ insertedId: "person-1" });
const mockPeopleInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 });
const mockPeopleUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
const mockPeopleUpdateMany = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
const mockPeopleDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
const mockPeopleDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 1 });

const mockPromisesFindToArray = vi.fn().mockResolvedValue([]);
const mockPromisesUpdateMany = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
const mockPromisesDeleteMany = vi.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 });

const mockUsersFindOne = vi.fn().mockResolvedValue(null);
const mockUsersUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

const mockWithTransaction = vi.fn(async (cb: () => Promise<unknown>) => cb());
const mockEndSession = vi.fn().mockResolvedValue(undefined);
const mockStartSession = vi.fn(() => ({
  withTransaction: mockWithTransaction,
  endSession: mockEndSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/server/session", () => ({
  getSession: () => mockSession(),
  getOwner: () => mockSession()?.userId ?? null,
}));

vi.mock("@/lib/mongo", () => ({
  entriesCol: () => ({
    findOne: mockEntriesFindOne,
    find: () => ({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      project: vi.fn().mockReturnThis(),
      projection: vi.fn().mockReturnThis(),
      toArray: mockEntriesFindToArray,
    }),
    insertOne: mockEntriesInsertOne,
    insertMany: mockEntriesInsertMany,
    updateOne: mockEntriesUpdateOne,
    updateMany: mockEntriesUpdateMany,
    deleteOne: mockEntriesDeleteOne,
    deleteMany: mockEntriesDeleteMany,
    aggregate: () => ({
      toArray: mockEntriesAggregateToArray,
    }),
  }),
  peopleCol: () => ({
    findOne: mockPeopleFindOne,
    find: () => ({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      project: vi.fn().mockReturnThis(),
      projection: vi.fn().mockReturnThis(),
      toArray: mockPeopleFindToArray,
    }),
    insertOne: mockPeopleInsertOne,
    insertMany: mockPeopleInsertMany,
    updateOne: mockPeopleUpdateOne,
    updateMany: mockPeopleUpdateMany,
    deleteOne: mockPeopleDeleteOne,
    deleteMany: mockPeopleDeleteMany,
  }),
  promisesCol: () => ({
    find: () => ({
      sort: vi.fn().mockReturnThis(),
      toArray: mockPromisesFindToArray,
    }),
    updateMany: mockPromisesUpdateMany,
    deleteMany: mockPromisesDeleteMany,
  }),
  usersCol: () => ({
    findOne: mockUsersFindOne,
    updateOne: mockUsersUpdateOne,
  }),
  mongoClient: () => ({
    startSession: mockStartSession,
  }),
}));

// Imports of modules under test
import { signSession, verifySession, verifyFullSession } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-next";
import { updatePerson, deletePerson } from "@/actions/people";
import { addEntry, editEntry, deleteEntry } from "@/actions/entries";
import { restorePerson, purgeTrashItem } from "@/actions/trash";
import { getPersonDetail, getTrashItems } from "@/server/readers";
import {
  idSchema,
  entrySchema,
  personSchema,
  loginSchema,
  ownerUpiSchema,
  isValidCalendarDate,
} from "@/lib/validation";
import { decimalStringToPaise } from "@/lib/money";
import { buildUpiPayUrl } from "@/lib/upi";
import {
  universalWaLink,
  reminderMessage,
  normalizeWaPhone,
} from "@/lib/whatsapp";
import type { PersonDetail } from "@/lib/types";

describe("Chai Ledger Automated Security Penetration Suite", () => {
  const SECRET_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET_KEY;
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // =========================================================================
  // 1. AUTHENTICATION & SESSION SECURITY
  // =========================================================================
  describe("Authentication & Session Security", () => {
    describe("JWT Algorithm Confusion & Signature Tampering", () => {
      it("rejects tokens crafted with alg: 'none'", async () => {
        const header = Buffer.from(
          JSON.stringify({ alg: "none", typ: "JWT" })
        ).toString("base64url");
        const payload = Buffer.from(
          JSON.stringify({ sub: "victim-owner", role: "OWNER" })
        ).toString("base64url");
        const token = `${header}.${payload}.`;

        expect(await verifySession(token)).toBeNull();
        expect(await verifyFullSession(token)).toBeNull();
      });

      it("rejects tokens crafted with asymmetric alg: 'RS256'", async () => {
        const header = Buffer.from(
          JSON.stringify({ alg: "RS256", typ: "JWT" })
        ).toString("base64url");
        const payload = Buffer.from(
          JSON.stringify({ sub: "victim-owner", role: "OWNER" })
        ).toString("base64url");
        const token = `${header}.${payload}.fakesig`;

        expect(await verifySession(token)).toBeNull();
        expect(await verifyFullSession(token)).toBeNull();
      });

      it("rejects tokens signed with an unauthorized HMAC secret", async () => {
        const foreignSecret = new TextEncoder().encode(
          "badsecretbadsecretbadsecretbadsecret"
        );
        const token = await new SignJWT({
          sub: "victim-owner",
          role: "OWNER",
        })
          .setProtectedHeader({ alg: "HS256" })
          .sign(foreignSecret);

        expect(await verifySession(token)).toBeNull();
        expect(await verifyFullSession(token)).toBeNull();
      });

      it("rejects expired tokens", async () => {
        const secret = new TextEncoder().encode(SECRET_KEY);
        const expiredToken = await new SignJWT({
          sub: "user-123",
          role: "OWNER",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("-10s")
          .sign(secret);

        expect(await verifySession(expiredToken)).toBeNull();
        expect(await verifyFullSession(expiredToken)).toBeNull();
      });

      it("rejects payload tampering without valid signature re-generation", async () => {
        const token = await signSession("user-clerk");
        const [h, , s] = token.split(".");
        const elevatedPayload = Buffer.from(
          JSON.stringify({ sub: "shop-owner" })
        ).toString("base64url");
        const tampered = `${h}.${elevatedPayload}.${s}`;

        expect(await verifySession(tampered)).toBeNull();
        expect(await verifyFullSession(tampered)).toBeNull();
      });

      it("rejects tokens missing a valid string sub claim", async () => {
        const secret = new TextEncoder().encode(SECRET_KEY);
        const token = await new SignJWT({ role: "OWNER" })
          .setProtectedHeader({ alg: "HS256" })
          .sign(secret);

        expect(await verifyFullSession(token)).toBeNull();
        expect(await verifySession(token)).toBeNull();
      });

      it("fails closed on null, undefined, or empty tokens", async () => {
        expect(await verifySession(null)).toBeNull();
        expect(await verifySession(undefined)).toBeNull();
        expect(await verifySession("")).toBeNull();
        expect(await verifyFullSession(null)).toBeNull();
      });
    });

    describe("Open Redirect Defense", () => {
      it("neutralizes protocol-relative, absolute URLs, and header injection attempts", () => {
        expect(safeNextPath("//evil.com")).toBe("/");
        expect(safeNextPath("/\\evil.com")).toBe("/");
        expect(safeNextPath("https://evil.com")).toBe("/");
        expect(safeNextPath("javascript:alert(1)")).toBe("/");
        expect(safeNextPath("/login\nSet-Cookie: evil")).toBe("/");
        expect(safeNextPath(undefined)).toBe("/");
        expect(safeNextPath("")).toBe("/");
        expect(safeNextPath("/dashboard")).toBe("/dashboard");
        expect(safeNextPath("/people/550e8400-e29b-41d4-a716-446655440000")).toBe(
          "/people/550e8400-e29b-41d4-a716-446655440000"
        );
      });
    });
  });

  // =========================================================================
  // 2. MULTI-TENANT ISOLATION (IDOR DEFENSE)
  // =========================================================================
  describe("Multi-Tenant Isolation (IDOR Defense)", () => {
    const OWNER_A = "a0000000-0000-4000-8000-000000000001";
    const PERSON_B = "b0000000-0000-4000-8000-000000000003";
    const ENTRY_B = "b0000000-0000-4000-8000-000000000004";

    beforeEach(() => {
      // Authenticated as OWNER_A
      mockSession.mockReturnValue({
        userId: OWNER_A,
        role: "OWNER",
      });
    });

    it("prevents Owner A from updating Owner B's customer details", async () => {
      // When OWNER_A attempts to update PERSON_B, query { _id: PERSON_B, ownerId: OWNER_A } matches 0 records
      mockPeopleUpdateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

      const fd = new FormData();
      fd.append("id", PERSON_B);
      fd.append("name", "Malicious Rename");
      fd.append("phone", "+91 98765 43210");

      const res = await updatePerson({}, fd);
      expect(res.error).toBe("Person not found.");
      expect(mockPeopleUpdateOne).toHaveBeenCalledWith(
        { _id: PERSON_B, ownerId: OWNER_A },
        expect.anything()
      );
    });

    it("prevents Owner A from deleting Owner B's customer", async () => {
      const fd = new FormData();
      fd.append("id", PERSON_B);

      try {
        await deletePerson(fd);
      } catch (e: unknown) {
        expect((e as Error).message).toContain("NEXT_REDIRECT: /");
      }

      // Verify that delete query strictly bound ownerId to OWNER_A
      expect(mockPeopleUpdateOne).toHaveBeenCalledWith(
        { _id: PERSON_B, ownerId: OWNER_A },
        expect.objectContaining({ $set: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
        expect.anything()
      );
      expect(mockEntriesUpdateMany).toHaveBeenCalledWith(
        { personId: PERSON_B, ownerId: OWNER_A },
        expect.objectContaining({ $set: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
        expect.anything()
      );
    });

    it("prevents Owner A from inserting an entry for Owner B's customer", async () => {
      // Owner A does not own PERSON_B
      mockPeopleFindOne.mockResolvedValue(null);

      const fd = new FormData();
      fd.append("personId", PERSON_B);
      fd.append("type", "GAVE");
      fd.append("amount", "500");

      const res = await addEntry({}, fd);
      expect(res.error).toBe("Person not found.");
      expect(mockPeopleFindOne).toHaveBeenCalledWith(
        { _id: PERSON_B, ownerId: OWNER_A },
        { projection: { _id: 1 } }
      );
      expect(mockEntriesInsertOne).not.toHaveBeenCalled();
    });

    it("prevents Owner A from editing Owner B's entries", async () => {
      // Entry does not belong to OWNER_A
      mockEntriesFindOne.mockResolvedValue(null);

      const fd = new FormData();
      fd.append("id", ENTRY_B);
      fd.append("type", "GAVE");
      fd.append("amount", "750");

      const res = await editEntry({}, fd);
      expect(res.error).toBe("Entry not found.");
      expect(mockEntriesFindOne).toHaveBeenCalledWith(
        { _id: ENTRY_B, ownerId: OWNER_A },
        expect.anything()
      );
      expect(mockEntriesUpdateOne).not.toHaveBeenCalled();
    });

    it("prevents Owner A from deleting Owner B's entries", async () => {
      const fd = new FormData();
      fd.append("entryId", ENTRY_B);
      fd.append("personId", PERSON_B);

      await deleteEntry(fd);
      // Query must be scoped strictly to OWNER_A
      expect(mockEntriesUpdateOne).toHaveBeenCalledWith(
        { _id: ENTRY_B, ownerId: OWNER_A },
        expect.objectContaining({ $set: expect.objectContaining({ deletedAt: expect.any(Date) }) })
      );
    });

    it("prevents Owner A from reading Owner B's customer data in getPersonDetail", async () => {
      // Reader fails closed if customer is not owned by OWNER_A
      mockPeopleFindOne.mockResolvedValue(null);

      const detail = await getPersonDetail(PERSON_B);
      expect(detail).toBeNull();
      expect(mockPeopleFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: PERSON_B, ownerId: OWNER_A }),
        expect.anything()
      );
    });

    it("prevents Owner A from viewing or restoring Owner B's trash items", async () => {
      // 1. Reading trash items strictly scopes to OWNER_A
      mockPeopleFindToArray.mockResolvedValue([]);
      mockEntriesFindToArray.mockResolvedValue([]);

      const trash = await getTrashItems();
      expect(trash).toEqual([]);

      // 2. Restoring person strictly scopes to OWNER_A
      const fdRestorePerson = new FormData();
      fdRestorePerson.append("id", PERSON_B);
      const resRestore = await restorePerson({}, fdRestorePerson);
      expect(resRestore.ok).toBe(true);
      expect(mockPeopleUpdateOne).toHaveBeenCalledWith(
        { _id: PERSON_B, ownerId: OWNER_A },
        { $set: { deletedAt: null } },
        expect.anything()
      );

      // 3. Purging trash item strictly scopes to OWNER_A
      const fdPurge = new FormData();
      fdPurge.append("id", PERSON_B);
      fdPurge.append("kind", "PERSON");
      const resPurge = await purgeTrashItem({}, fdPurge);
      expect(resPurge.ok).toBe(true);
      expect(mockPeopleDeleteOne).toHaveBeenCalledWith(
        { _id: PERSON_B, ownerId: OWNER_A },
        expect.anything()
      );
    });
  });

  // =========================================================================
  // 3. INJECTION DEFENSE & INPUT VALIDATION
  // =========================================================================
  describe("Injection Defense & Input Validation", () => {
    describe("NoSQL Operator Injection Defense", () => {
      it("strictly rejects NoSQL operator objects across all Zod input schemas", () => {
        const maliciousNoSqlObjects = [
          { $ne: null },
          { $gt: "" },
          { $regex: ".*" },
          { $where: "sleep(5000)" },
        ];

        for (const badObj of maliciousNoSqlObjects) {
          expect(idSchema.safeParse(badObj).success).toBe(false);
          expect(
            personSchema.safeParse({ name: badObj, phone: "+91 98765 43210" })
              .success
          ).toBe(false);
          expect(
            entrySchema.safeParse({
              personId: badObj,
              type: "GAVE",
              amount: "100",
            }).success
          ).toBe(false);
          expect(
            loginSchema.safeParse({ email: badObj, password: "password" })
              .success
          ).toBe(false);
          expect(
            ownerUpiSchema.safeParse({ upiId: badObj, upiName: "Shop" }).success
          ).toBe(false);
        }
      });
    });

    describe("UUID Strictness & Anti-Tampering", () => {
      it("strictly validates UUID format and rejects tampering payloads in idSchema", () => {
        const invalidUuids = [
          "not-a-uuid",
          "",
          "123e4567-e89b-12d3-a456-42661417400", // too short
          "123e4567-e89b-12d3-a456-4266141740000", // too long
          "123e4567-e89b-12d3-a456-42661417400g", // non-hex character
          "123e4567e89b12d3a456426614174000", // missing hyphens
          "../etc/passwd", // path traversal
          "1; DROP TABLE entries;", // SQL injection
          "<script>alert(1)</script>", // XSS payload
        ];

        for (const badId of invalidUuids) {
          expect(idSchema.safeParse(badId).success).toBe(false);
        }

        expect(
          idSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success
        ).toBe(true);
      });
    });

    describe("Calendar Date Validation Strictness", () => {
      it("strictly rejects impossible calendar dates and format distortions in isValidCalendarDate", () => {
        const impossibleDates = [
          "2025-02-29", // Non-leap year Feb 29
          "1900-02-29", // Century non-leap year
          "2025-02-30",
          "2025-02-31",
          "2025-04-31", // 30-day month
          "2025-06-31",
          "2025-09-31",
          "2025-11-31",
          "2025-00-10", // Invalid month 00
          "2025-13-01", // Invalid month 13
          "2025-01-00", // Invalid day 00
          "2025-01-32", // Invalid day 32
          "2025/02/15", // Slash separator
          "15-02-2025", // Inverted format
          "2025-2-5", // Missing zero-padding
        ];

        for (const badDate of impossibleDates) {
          expect(isValidCalendarDate(badDate)).toBe(false);
        }

        expect(isValidCalendarDate("2024-02-29")).toBe(true); // Valid leap year
        expect(isValidCalendarDate("2000-02-29")).toBe(true); // Century leap year
        expect(isValidCalendarDate("2026-11-16")).toBe(true);
      });
    });

    describe("Money / Numeric Invariants & Boundary Enforcements", () => {
      it("strictly rejects negative, scientific notation, NaN, sub-paise, zero, and out-of-bounds amounts in entrySchema", () => {
        const invalidAmounts = [
          "-100",
          "-0.01",
          "0",
          "0.00",
          "1e6",
          "1E6",
          "100.125", // Sub-paise
          "NaN",
          "Infinity",
          "-Infinity",
          "10000000", // Exceeds 7-digit limit (> 9,999,999.99 INR)
          "10000000.00",
          "abc",
          "",
        ];

        for (const badAmt of invalidAmounts) {
          const res = entrySchema.safeParse({
            personId: "550e8400-e29b-41d4-a716-446655440000",
            type: "GAVE",
            amount: badAmt,
          });
          expect(res.success).toBe(false);
        }

        const validAmounts = ["1", "250", "250.5", "250.50", "9999999.99"];
        for (const goodAmt of validAmounts) {
          const res = entrySchema.safeParse({
            personId: "550e8400-e29b-41d4-a716-446655440000",
            type: "GAVE",
            amount: goodAmt,
          });
          expect(res.success).toBe(true);
        }
      });

      it("handles exact integer paise conversion and sub-paise rounding without binary drift in decimalStringToPaise", () => {
        expect(decimalStringToPaise("250.556")).toBe(25056);
        expect(decimalStringToPaise("250.554")).toBe(25055);
        expect(decimalStringToPaise("-250.50")).toBe(-25050);
        expect(decimalStringToPaise("10000000")).toBe(1000000000); // 10M INR in paise fits within JS safe integer
        expect(Number.isSafeInteger(decimalStringToPaise("10000000"))).toBe(true);
      });
    });

    describe("XSS & UPI Parameter Injection Defense", () => {
      it("neutralizes UPI parameter splitting and rejects malicious VPA formats in buildUpiPayUrl", () => {
        // Rejects invalid VPAs with injected query parameters or scripts
        expect(
          buildUpiPayUrl({ pa: "attacker@upi&am=9999", pn: "Store" })
        ).toBeNull();
        expect(
          buildUpiPayUrl({ pa: "javascript:alert(1)", pn: "Store" })
        ).toBeNull();
        expect(
          buildUpiPayUrl({ pa: "<script>alert(1)</script>@upi", pn: "Store" })
        ).toBeNull();

        // Parameter splitting injection via merchant name or transaction note is percent-encoded
        const url = buildUpiPayUrl({
          pa: "merchant@okhdfcbank",
          pn: "Store & Sons",
          amountCents: 50000,
          tn: "Payment &am=9999999&pa=attacker@upi",
        });

        expect(url).not.toBeNull();
        const parsed = new URL(url!);
        // The authoritative VPA and amount remain uncorrupted
        expect(parsed.searchParams.get("pa")).toBe("merchant@okhdfcbank");
        expect(parsed.searchParams.get("am")).toBe("500.00");
        expect(parsed.searchParams.get("pn")).toBe("Store & Sons");
        // The injected parameters remain literal values inside the 'tn' param rather than distinct query params
        expect(parsed.searchParams.get("tn")).toBe(
          "Payment &am=9999999&pa=attacker@upi"
        );
      });

      it("safely percent-encodes XSS payloads in WhatsApp reminder links", () => {
        const xssDetail: PersonDetail = {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "<script>alert('xss')</script>",
          phone: "+91 98765 43210",
          balance: "1000",
          gaveTotal: "1000",
          receivedTotal: "0",
          entries: [],
          ownerUpi: {
            upiId: "shop@upi",
            upiName: "<b>Super Kirana</b>",
          },
        };

        const msg = reminderMessage(xssDetail);
        const link = universalWaLink(msg, normalizeWaPhone(xssDetail.phone!));

        expect(link).toContain("https://wa.me/919876543210?text=");
        // Plain unencoded HTML/JS tags must never appear in the query string
        expect(link).not.toContain("<script>");
        expect(link).not.toContain("<b>");
        // Strict percent-encoding must be applied
        expect(link).toContain("%3Cscript%3E");
        expect(link).toContain("%3Cb%3E");
      });

      it("strictly validates phone numbers and rejects non-numeric schemes or injection in normalizeWaPhone", () => {
        expect(normalizeWaPhone("9876543210")).toBe("919876543210");
        expect(normalizeWaPhone("+91 98765 43210")).toBe("919876543210");
        expect(normalizeWaPhone("09876543210")).toBe("919876543210");

        // Rejection of injection / URL tampering payloads
        expect(normalizeWaPhone("9876543210?extra=param")).toBeNull();
        expect(normalizeWaPhone("javascript:alert(1)")).toBeNull();
        expect(normalizeWaPhone("../../admin")).toBeNull();
        expect(normalizeWaPhone("<script>")).toBeNull();
      });
    });
  });
});
