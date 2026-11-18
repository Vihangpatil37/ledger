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
};

export type VerifiedSession = {
  userId: string;
};

/** Signs a 30-day session token carrying the user id. */
export function signSession(userOrId: string | SessionUser): Promise<string> {
  const userId = typeof userOrId === "string" ? userOrId : userOrId.userId;

  return new SignJWT({ sub: userId })
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

/** Returns full session claims, or null. Never throws. */
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
    };
  } catch {
    return null;
  }
}
