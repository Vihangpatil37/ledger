"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth";
import { staffCol, usersCol } from "@/lib/mongo";
import { safeNextPath } from "@/lib/safe-next";
import type { ActionState } from "@/lib/types";
import {
  fieldErrorsOf,
  loginSchema,
  normalizeIndianPhone,
  staffLoginSchema,
} from "@/lib/validation";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};

// Constant-time dummy hash prevents user enumeration via bcrypt timing
const DUMMY_HASH = "$2a$10$e8wNuUuY.1zO81k.U386r.Zg9737.mC3yH4G9V8q7NlU8O2YfD1uK";

const MAX_STAFF_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

type AttemptRecord = {
  count: number;
  lockedUntil?: number;
};

// In-memory rate-limiter keyed by normalized shop identifier
const staffLoginAttempts = new Map<string, AttemptRecord>();

export async function resetStaffLoginAttempts(identifier: string): Promise<void> {
  staffLoginAttempts.delete(identifier.trim().toUpperCase());
}

export async function login(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let user: { _id: string; passwordHash: string } | null = null;
  try {
    // Emails are stored lowercase (the setup script normalizes too).
    user = await usersCol().findOne(
      { email: parsed.data.email.toLowerCase() },
      { projection: { passwordHash: 1 } }
    );
  } catch {
    return { error: "Could not reach the database. Try again." };
  }

  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
  const isMatch = await compare(parsed.data.password, hashToCompare);

  if (!user || !isMatch) {
    return { error: "Wrong email or password." };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(user._id), COOKIE_OPTIONS);

  const nextRaw = formData.get("next");
  redirect(
    safeNextPath(
      typeof nextRaw === "string" ? nextRaw : undefined
    )
  );
}

export async function loginStaff(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = staffLoginSchema.safeParse({
    shopIdentifier: formData.get("shopIdentifier"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const rawIdent = parsed.data.shopIdentifier.trim();
  const lookupKey = rawIdent.toUpperCase();
  const now = Date.now();
  const attempt = staffLoginAttempts.get(lookupKey);

  if (attempt?.lockedUntil && attempt.lockedUntil > now) {
    const minutesLeft = Math.ceil((attempt.lockedUntil - now) / 60000);
    return {
      error: `Too many failed attempts. Login is locked for ${minutesLeft} more minute${minutesLeft === 1 ? "" : "s"}.`,
    };
  }

  const phoneIdent = normalizeIndianPhone(rawIdent);

  let owner: { _id: string } | null = null;
  try {
    const conditions: Array<Record<string, unknown>> = [
      { shopCode: rawIdent.toUpperCase() },
      { email: rawIdent.toLowerCase() },
    ];
    if (phoneIdent) conditions.push({ phone: phoneIdent });

    owner = await usersCol().findOne(
      { $or: conditions },
      { projection: { _id: 1 } }
    );
  } catch {
    return { error: "Could not reach the database. Try again." };
  }

  if (!owner) {
    await compare(parsed.data.pin, DUMMY_HASH);
    return { error: "Shop not found. Check the shop code, phone, or email." };
  }

  let staffList: Array<{ _id: string; name: string; pinHash: string; isActive: boolean }> = [];
  try {
    staffList = await staffCol().find({ ownerId: owner._id, isActive: true }).toArray();
  } catch {
    return { error: "Could not load staff accounts." };
  }

  if (staffList.length === 0) {
    await compare(parsed.data.pin, DUMMY_HASH);
    return { error: "Invalid PIN or inactive staff account." };
  }

  let matchedStaff: { _id: string; name: string } | null = null;
  for (const s of staffList) {
    if (await compare(parsed.data.pin, s.pinHash)) {
      matchedStaff = s;
      break;
    }
  }

  if (!matchedStaff) {
    const nextCount = (attempt?.count ?? 0) + 1;
    if (nextCount >= MAX_STAFF_ATTEMPTS) {
      staffLoginAttempts.set(lookupKey, {
        count: nextCount,
        lockedUntil: now + LOCKOUT_MS,
      });
      return {
        error: "Too many failed attempts. This shop login is locked for 15 minutes.",
      };
    }

    staffLoginAttempts.set(lookupKey, { count: nextCount });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const remaining = MAX_STAFF_ATTEMPTS - nextCount;
    return {
      error: `Invalid PIN or inactive staff account. (${remaining} attempt${remaining === 1 ? "" : "s"} left)`,
    };
  }

  // Successful login clears any failed attempt counter
  staffLoginAttempts.delete(lookupKey);

  const jar = await cookies();
  jar.set(
    SESSION_COOKIE,
    await signSession({
      userId: owner._id,
      role: "STAFF",
      staffId: matchedStaff._id,
      staffName: matchedStaff.name,
    }),
    COOKIE_OPTIONS
  );

  const nextRaw = formData.get("next");
  redirect(
    safeNextPath(
      typeof nextRaw === "string" ? nextRaw : undefined
    )
  );
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
