import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  verifyFullSession,
  type VerifiedSession,
} from "@/lib/auth";

export type { VerifiedSession };

/**
 * The full session context with role and staff details, or null.
 * Cached per request across all Server Components, Readers, and Layouts.
 */
export const getSession = cache(async (): Promise<VerifiedSession | null> => {
  try {
    const jar = await cookies();
    return await verifyFullSession(jar.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
});

/**
 * The signed-in user id, or null. Fails closed: never throws.
 * Delegates to request-cached getSession so tokens are verified once per request.
 */
export const getOwner = cache(async (): Promise<string | null> => {
  return (await getSession())?.userId ?? null;
});
