import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { getSessionSecret } from "@/server/env";

export const SESSION_COOKIE = "ledger_session";
/** 30 days, in seconds. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

let cachedSecret: Uint8Array | undefined;
function secret(): Uint8Array {
  cachedSecret ??= new TextEncoder().encode(getSessionSecret());
  return cachedSecret;
}

export type SessionUser = {
  userId: string;
  role?: "OWNER" | "STAFF";
  staffId?: string;
  staffName?: string;
};

export type VerifiedSession = {
  userId: string;
  role: "OWNER" | "STAFF";
  staffId?: string;
  staffName?: string;
};

/** Signs a 30-day session token carrying the user id and optional staff claims. */
export function signSession(userOrId: string | SessionUser): Promise<string> {
  const payload: Record<string, unknown> =
    typeof userOrId === "string"
      ? { sub: userOrId, role: "OWNER" }
      : {
          sub: userOrId.userId,
          role: userOrId.role ?? "OWNER",
          ...(userOrId.staffId ? { staffId: userOrId.staffId } : {}),
          ...(userOrId.staffName ? { staffName: userOrId.staffName } : {}),
        };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

/** Returns the user id for a valid token, or null. Never throws. */
export async function verifySession(
  token: string | undefined | null
): Promise<string | null> {
  const full = await verifyFullSession(token);
  return full ? full.userId : null;
}

/** Returns full session claims (role, staff attribution), or null. Never throws. */
export async function verifyFullSession(
  token: string | undefined | null
): Promise<VerifiedSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return {
      userId: payload.sub,
      role: payload.role === "STAFF" ? "STAFF" : "OWNER",
      staffId: typeof payload.staffId === "string" ? payload.staffId : undefined,
      staffName: typeof payload.staffName === "string" ? payload.staffName : undefined,
    };
  } catch {
    return null;
  }
}
