"use client";

import { useActionState, useEffect, useState } from "react";
import { editEntry } from "@/actions/entries";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import { useLanguage } from "@/lib/i18n/client";
import type { ActionState, EntryRow, EntryType } from "@/lib/types";

export function EditEntryModal({
  entry,
}: {
  entry: EntryRow;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<EntryType>(entry.type);
  const { t } = useLanguage();

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    editEntry,
    {}
  );

  // Close modal when successfully updated
  useEffect(() => {
    if (state.ok) {
      setIsOpen(false);
    }
  }, [state]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setType(entry.type);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, entry.type]);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex size-7 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors cursor-pointer"
        aria-label={t("entry.editEntry")}
        title={t("entry.editEntry")}
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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-entry-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-t-2xl border-t border-rule bg-surface p-5 shadow-2xl sm:rounded-2xl sm:border max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-rule/60 pb-3.5">
              <div>
                <h3
                  id="edit-entry-modal-title"
                  className="font-display text-lg font-bold tracking-tight text-ink"
                >
                  {t("entry.editEntry")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors cursor-pointer"
                aria-label={t("common.close")}
              >
                ✕
              </button>
            </div>

            {/* Edit Form */}
            <form action={formAction} className="space-y-4 pt-4 overflow-y-auto">
              <input type="hidden" name="id" value={entry.id} />
              <input type="hidden" name="type" value={type} />

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                {options.map((option) => {
                  const active = type === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setType(option.value)}
                      className={`min-h-[50px] rounded-xl border px-3 py-2 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] ${
                        active
                          ? option.activeClass
                          : "border-rule bg-surface text-ink hover:bg-paper active:bg-rule/20"
                      }`}
                    >
                      <span className="block text-xs font-semibold tracking-tight">
                        {option.label}
                      </span>
                      <span
                        className={`mt-0.5 block text-[11px] truncate ${
                          active ? option.hintClass : "text-muted"
                        }`}
                      >
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">{t("entry.amount")} (₹)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-muted">
                    ₹
                  </span>
                  <input
                    id="edit-amount"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    defaultValue={entry.amount}
                    required
                    className={`${inputClass} pl-8 font-mono font-medium tracking-tight`}
                  />
                </div>
                <FieldError message={state.fieldErrors?.amount} />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-note">{t("entry.note")}</Label>
                <input
                  id="edit-note"
                  name="note"
                  maxLength={200}
                  defaultValue={entry.note ?? ""}
                  placeholder={t("entry.notePlaceholder")}
                  className={inputClass}
                />
                <FieldError message={state.fieldErrors?.note} />
              </div>

              {/* Promised Return (GAVE only) */}
              {type === "GAVE" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-dueDate">{t("entry.dueDate")}</Label>
                  <input
                    id="edit-dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={entry.dueDate ?? ""}
                    className={`${inputClass} font-mono text-xs`}
                  />
                  <FieldError message={state.fieldErrors?.dueDate} />
                </div>
              ) : null}

              {state.error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-danger/20 bg-danger-light px-3 py-2 text-xs font-medium text-danger"
                >
                  {state.error}
                </p>
              ) : null}

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  type="submit"
                  disabled={pending}
                  className="w-full flex-1 cursor-pointer"
                >
                  {pending ? t("entry.saving") : t("entry.saveChanges")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
