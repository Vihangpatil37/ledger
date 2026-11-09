import { describe, it, expect, beforeAll } from "vitest";

describe("auth sessions (JWT)", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("signs and verifies valid session tokens", async () => {
    const { signSession, verifySession } = await import("@/lib/auth");
    const userId = "user-123-uuid";
    const token = await signSession(userId);

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const verifiedUserId = await verifySession(token);
    expect(verifiedUserId).toBe(userId);
  });

  it("fails closed on null or empty tokens", async () => {
    const { verifySession } = await import("@/lib/auth");
    expect(await verifySession(null)).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("")).toBeNull();
  });

  it("fails closed on tampered tokens", async () => {
    const { signSession, verifySession } = await import("@/lib/auth");
    const token = await signSession("legit-user");
    const tampered = token.slice(0, -5) + "abcde";

    expect(await verifySession(tampered)).toBeNull();
  });

  it("fails closed on malformed tokens", async () => {
    const { verifySession } = await import("@/lib/auth");
    expect(await verifySession("not.a.valid.jwt")).toBeNull();
  });
});
