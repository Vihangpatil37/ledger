import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/** The signed-in user id, or null. Fails closed: never throws. */
export async function getOwner(): Promise<string | null> {
  try {
    const jar = await cookies();
    return await verifySession(jar.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

