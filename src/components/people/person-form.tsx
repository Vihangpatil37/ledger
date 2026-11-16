"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createPerson, updatePerson } from "@/actions/people";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import { PhoneInput } from "@/components/people/phone-input";
import { useLanguage } from "@/lib/i18n/client";
import type { ActionState } from "@/lib/types";

type PersonLite = { id: string; name: string; phone: string | null };

export function PersonForm({ person }: { person?: PersonLite }) {
  const isUpdate = person !== undefined;
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    isUpdate ? updatePerson : createPerson,
    {}
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_12px_0_rgba(30,27,24,0.04)]"
    >
      {isUpdate ? <input type="hidden" name="id" value={person.id} /> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("form.fullName")}</Label>
        <input
          id="name"
          name="name"
          required
          maxLength={60}
          defaultValue={person?.name}
          autoCapitalize="words"
          placeholder={t("form.fullNamePlaceholder")}
          className={inputClass}
        />
        <FieldError message={state.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">{t("form.phone")}</Label>
        <PhoneInput
          id="phone"
          name="phone"
          defaultValue={person?.phone ?? ""}
          placeholder={t("form.phonePlaceholder")}
          className={inputClass}
        />
        <p className="text-[11px] text-muted">
          {t("form.phoneHelp")}
        </p>
        <FieldError
          message={
            state.fieldErrors?.phone
              ? t("form.phoneInvalid")
              : undefined
          }
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-light px-3.5 py-2 text-xs sm:text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm font-medium text-credit flex items-center gap-1.5">
          <span>✓</span>
          <span>Contact saved</span>
        </p>
      ) : null}

      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        <Button
          type="submit"
          disabled={pending}
          isLoading={pending}
          className="w-full sm:w-auto min-w-[130px] cursor-pointer"
        >
          {pending
            ? "…"
            : isUpdate
              ? t("form.savePerson")
              : t("form.createPerson")}
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-xl border border-rule/60 sm:border-transparent bg-surface sm:bg-transparent px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink hover:bg-rule/20 transition-colors focus-visible:outline-2 focus-visible:outline-focus"
        >
          {t("form.cancel")}
        </Link>
      </div>
    </form>
  );
}
