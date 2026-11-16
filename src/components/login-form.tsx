"use client";

import { useState } from "react";
import { useActionState } from "react";
import { login, loginStaff } from "@/actions/auth";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/types";

export function LoginForm({
  next,
  defaultShop,
}: {
  next?: string;
  defaultShop?: string;
}) {
  const [mode, setMode] = useState<"OWNER" | "STAFF">(
    defaultShop ? "STAFF" : "OWNER"
  );

  const [ownerState, ownerAction, ownerPending] = useActionState<
    ActionState,
    FormData
  >(login, {});

  const [staffState, staffAction, staffPending] = useActionState<
    ActionState,
    FormData
  >(loginStaff, {});

  const pending = mode === "OWNER" ? ownerPending : staffPending;

  return (
    <div className="space-y-5">
      {/* Segmented Switcher */}
      <div className="grid grid-cols-2 rounded-xl bg-paper p-1 border border-rule/60 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode("OWNER")}
          className={`rounded-lg py-2 transition-all ${
            mode === "OWNER"
              ? "bg-surface text-ink shadow-[0_1px_3px_0_rgba(30,27,24,0.1)]"
              : "text-muted hover:text-ink"
          }`}
        >
          Shop Owner
        </button>
        <button
          type="button"
          onClick={() => setMode("STAFF")}
          className={`rounded-lg py-2 transition-all ${
            mode === "STAFF"
              ? "bg-surface text-ink shadow-[0_1px_3px_0_rgba(30,27,24,0.1)]"
              : "text-muted hover:text-ink"
          }`}
        >
          Munim / Staff
        </button>
      </div>

      {mode === "OWNER" ? (
        <form action={ownerAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="space-y-1.5">
            <Label htmlFor="email">Owner Email</Label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              placeholder="you@example.com"
              className={inputClass}
            />
            <FieldError message={ownerState.fieldErrors?.email} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
            />
            <FieldError message={ownerState.fieldErrors?.password} />
          </div>

          {ownerState.error ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/20 bg-danger-light px-3 py-2 text-sm font-medium text-danger"
            >
              {ownerState.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in as Owner"}
          </Button>
        </form>
      ) : (
        <form action={staffAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="space-y-1.5">
            <Label htmlFor="shopIdentifier">Shop Code or Owner Email</Label>
            <input
              id="shopIdentifier"
              name="shopIdentifier"
              type="text"
              required
              autoCapitalize="characters"
              defaultValue={defaultShop ?? ""}
              placeholder="e.g. CHAI-54C1 or owner@gmail.com"
              className={inputClass}
            />
            <p className="text-[11px] text-muted">
              Find your Shop Code in Settings → Staff Access, or enter the Owner&apos;s email.
            </p>
            <FieldError message={staffState.fieldErrors?.shopIdentifier} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pin">4-Digit Staff PIN</Label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              required
              placeholder="••••"
              className={`${inputClass} tracking-widest text-center text-lg font-mono`}
            />
            <FieldError message={staffState.fieldErrors?.pin} />
          </div>

          {staffState.error ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/20 bg-danger-light px-3 py-2 text-sm font-medium text-danger"
            >
              {staffState.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Verifying PIN…" : "Enter Counter Shift"}
          </Button>
        </form>
      )}
    </div>
  );
}
