"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addEntry } from "@/actions/entries";
import { CalculatorModal } from "@/components/people/calculator-modal";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import { QuickVoiceButton } from "@/components/voice/quick-voice-button";
import { useLanguage } from "@/lib/i18n/client";
import type { ActionState, EntryType } from "@/lib/types";

export function AddEntryCard({ personId }: { personId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addEntry,
    {}
  );
  const [type, setType] = useState<EntryType>("GAVE");
  const formRef = useRef<HTMLFormElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    function handleCustomAmount(e: Event) {
      const customEvent = e as CustomEvent<{ amount: string }>;
      if (customEvent.detail?.amount && amountInputRef.current) {
        amountInputRef.current.value = customEvent.detail.amount;
        amountInputRef.current.focus();
      }
    }
    window.addEventListener("ledger:set-amount", handleCustomAmount);
    return () => window.removeEventListener("ledger:set-amount", handleCustomAmount);
  }, []);

  const options: Array<{
    value: EntryType;
    label: string;
    hint: string;
    activeClass: string;
    hintClass: string;
  }> = [
    {
      value: "GAVE",
      label: t("entry.gave"),
      hint: t("entry.gaveHint"),
      activeClass: "border-debit bg-debit text-white shadow-2xs",
      hintClass: "text-white/85",
    },
    {
      value: "RECEIVED",
      label: t("entry.received"),
      hint: t("entry.receivedHint"),
      activeClass: "border-credit bg-credit text-white shadow-2xs",
      hintClass: "text-white/85",
    },
  ];

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-rule bg-surface p-4 sm:p-6 shadow-[0_2px_12px_0_rgba(30,27,24,0.04)]"
    >
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {options.map((option) => {
          const active = type === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setType(option.value)}
              className={`min-h-[54px] rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] cursor-pointer ${
                active
                  ? option.activeClass
                  : "border-rule bg-surface text-ink hover:bg-paper active:bg-rule/20"
              }`}
            >
              <span className="block text-xs sm:text-sm font-semibold tracking-tight">
                {option.label}
              </span>
              <span
                className={`mt-0.5 block text-[11px] sm:text-xs truncate ${
                  active ? option.hintClass : "text-muted"
                }`}
              >
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount">{t("entry.amount")} (₹)</Label>
            <CalculatorModal
              customTrigger={(open) => (
                <button
                  type="button"
                  onClick={open}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-focus hover:underline focus-visible:outline-2 focus-visible:outline-focus cursor-pointer"
                  title={t("calculator.title")}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <rect width="16" height="20" x="4" y="2" rx="2" />
                    <line x1="8" x2="16" y1="6" y2="6" />
                    <line x1="16" x2="16" y1="14" y2="18" />
                    <path d="M16 10h.01" />
                    <path d="M12 10h.01" />
                    <path d="M8 10h.01" />
                    <path d="M12 14h.01" />
                    <path d="M8 14h.01" />
                    <path d="M12 18h.01" />
                    <path d="M8 18h.01" />
                  </svg>
                  <span>{t("calculator.openButton")}</span>
                </button>
              )}
            />
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-muted">
              ₹
            </span>
            <input
              ref={amountInputRef}
              id="amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              placeholder="0.00"
              className={`${inputClass} pl-8 pr-9 font-mono font-medium tracking-tight`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
              <QuickVoiceButton
                targetInputRef={amountInputRef}
                numericOnly
                mode="replace"
                size="sm"
              />
            </div>
          </div>
          <FieldError message={state.fieldErrors?.amount} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="note">{t("entry.note")}</Label>
            <QuickVoiceButton
              targetInputRef={noteInputRef}
              mode="append"
              size="sm"
            />
          </div>
          <input
            ref={noteInputRef}
            id="note"
            name="note"
            maxLength={200}
            autoComplete="off"
            placeholder={t("entry.notePlaceholder")}
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.note} />
        </div>

        {type === "GAVE" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDate">{t("entry.dueDate")}</Label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              className={`${inputClass} font-mono text-xs`}
            />
            <FieldError message={state.fieldErrors?.dueDate} />
          </div>
        ) : null}
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
        <p role="status" className="text-xs sm:text-sm font-medium text-credit flex items-center gap-1.5">
          <span>✓</span>
          <span>Transaction recorded successfully</span>
        </p>
      ) : null}

      <div className="pt-1">
        <Button
          type="submit"
          disabled={pending}
          isLoading={pending}
          className="w-full sm:w-auto min-w-[140px] cursor-pointer"
        >
          {pending ? t("entry.saving") : t("entry.saveEntry")}
        </Button>
      </div>
    </form>
  );
}
