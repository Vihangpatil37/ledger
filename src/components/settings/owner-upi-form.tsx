"use client";

import { useActionState } from "react";
import { updateOwnerUpi } from "@/actions/profile";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import { useLanguage } from "@/lib/i18n/client";
import type { ActionState, OwnerProfile } from "@/lib/types";

export function OwnerUpiForm({ profile }: { profile: OwnerProfile }) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateOwnerUpi,
    {}
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_12px_0_rgba(30,27,24,0.04)]"
    >
      <div>
        <h2 className="font-display text-base font-bold text-ink tracking-tight">
          {t("settings.upiTitle")}
        </h2>
        <p className="font-mono text-xs text-muted mt-0.5">
          {t("settings.upiSubtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upiId">{t("settings.upiIdLabel")}</Label>
        <input
          id="upiId"
          name="upiId"
          type="text"
          maxLength={50}
          defaultValue={profile.upiId ?? ""}
          placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
          className={inputClass}
        />
        <p className="text-[11px] text-muted">
          {t("settings.upiHelp")}
        </p>
        <FieldError message={state.fieldErrors?.upiId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upiName">{t("settings.upiNameLabel")}</Label>
        <input
          id="upiName"
          name="upiName"
          type="text"
          maxLength={40}
          defaultValue={profile.upiName ?? ""}
          placeholder="e.g. Ramesh Patel"
          className={inputClass}
        />
        <FieldError message={state.fieldErrors?.upiName} />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-light px-3.5 py-2 text-xs font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-xs font-medium text-credit flex items-center gap-1.5">
          <span>✓</span>
          <span>{t("settings.upiSaved")}</span>
        </p>
      ) : null}

      <div className="pt-1">
        <Button
          type="submit"
          disabled={pending}
          isLoading={pending}
          className="w-full sm:w-auto min-w-[130px] cursor-pointer"
        >
          {pending ? t("entry.saving") : t("settings.upiSaveBtn")}
        </Button>
      </div>
    </form>
  );
}
