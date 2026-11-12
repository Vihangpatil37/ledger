"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth";
import { usersCol } from "@/lib/mongo";
import { safeNextPath } from "@/lib/safe-next";
import type { ActionState } from "@/lib/types";
import { fieldErrorsOf, loginSchema } from "@/lib/validation";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};

// Constant-time dummy hash prevents user enumeration via bcrypt timing
const DUMMY_HASH = "$2a$10$e8wNuUuY.1zO81k.U386r.Zg9737.mC3yH4G9V8q7NlU8O2YfD1uK";

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

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
