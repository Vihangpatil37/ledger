"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/types";

export function LoginForm({
  next,
}: {
  next?: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    login,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
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
        <FieldError message={state.fieldErrors?.email} />
      </div>

      <div className="flex flex-col gap-1.5">
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
        <FieldError message={state.fieldErrors?.password} />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-light px-3.5 py-2 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        isLoading={isPending}
        className="w-full cursor-pointer mt-1"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
