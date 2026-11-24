"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { editEntry } from "@/actions/entries";
import {
  Dialog,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, FieldError, IconButton, Label, inputClass } from "@/components/ui";
import { QuickVoiceButton } from "@/components/voice/quick-voice-button";
import { useLanguage } from "@/lib/i18n/client";
import type { ActionState, EntryRow, EntryType } from "@/lib/types";

export function EditEntryModal({
  entry,
}: {
  entry: EntryRow;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<EntryType>(entry.type);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
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

  // Sync type when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(entry.type);
    }
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
      <IconButton
        onClick={() => setIsOpen(true)}
        ariaLabel={t("entry.editEntry")}
        title={t("entry.editEntry")}
        className="size-9 min-h-[36px] min-w-[36px]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </IconButton>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="edit-entry-modal-title"
      >
        <DialogHeader>
          <DialogTitle id="edit-entry-modal-title">
            {t("entry.editEntry")}
          </DialogTitle>
          <DialogCloseButton
            onClose={() => setIsOpen(false)}
            ariaLabel={t("common.close")}
          />
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4 pt-4 overflow-y-auto">
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
                  className={`min-h-[50px] rounded-xl border px-3 py-2 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] cursor-pointer ${
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-amount">{t("entry.amount")} (₹)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-muted">
                ₹
              </span>
              <input
                ref={amountInputRef}
                id="edit-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                defaultValue={entry.amount}
                required
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

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-note">{t("entry.note")}</Label>
              <QuickVoiceButton
                targetInputRef={noteInputRef}
                mode="append"
                size="sm"
              />
            </div>
            <input
              ref={noteInputRef}
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
            <div className="flex flex-col gap-1.5">
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
              className="rounded-xl border border-danger/20 bg-danger-light px-3 py-2 text-xs font-medium text-danger"
            >
              {state.error}
            </p>
          ) : null}

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="submit"
              disabled={pending}
              isLoading={pending}
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
      </Dialog>
    </>
  );
}
