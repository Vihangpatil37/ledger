"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addEntry } from "@/actions/entries";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import type { ActionState, EntryType } from "@/lib/types";

const OPTIONS: Array<{
  value: EntryType;
  label: string;
  hint: string;
  activeClass: string;
  hintClass: string;
}> = [
  {
    value: "GAVE",
    label: "Udhar",
    hint: "they owe you",
    activeClass: "border-debit bg-debit text-white shadow-2xs",
    hintClass: "text-white/85",
  },
  {
    value: "RECEIVED",
    label: "You received",
    hint: "they paid back",
    activeClass: "border-credit bg-credit text-white shadow-2xs",
    hintClass: "text-white/85",
  },
];

export function AddEntryCard({ personId }: { personId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addEntry,
    {}
  );
  const [type, setType] = useState<EntryType>("GAVE");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-xl border border-rule bg-surface p-4 sm:p-6 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)]"
    >
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {OPTIONS.map((option) => {
          const active = type === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setType(option.value)}
              className={`min-h-[54px] rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] ${
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
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (₹)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-muted">
              ₹
            </span>
            <input
              id="amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              placeholder="0.00"
              className={`${inputClass} pl-8 font-mono font-medium tracking-tight`}
            />
          </div>
          <FieldError message={state.fieldErrors?.amount} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <input
            id="note"
            name="note"
            maxLength={200}
            autoComplete="off"
            placeholder="What was it for?"
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.note} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Promised return (optional)</Label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className={`${inputClass} font-mono text-xs`}
          />
          <FieldError message={state.fieldErrors?.dueDate} />
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger-light px-3 py-2 text-xs sm:text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-xs sm:text-sm font-medium text-credit">
          Entry saved ✓
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save entry"}
      </Button>
    </form>
  );
}

