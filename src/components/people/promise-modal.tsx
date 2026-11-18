"use client";

import { useActionState, useEffect, useState } from "react";
import { clearPromiseToPay, setPromiseToPay } from "@/actions/reminders";
import {
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import { formatDateToIst } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/client";
import type { ActionState } from "@/lib/types";

export function PromiseModal({
  personId,
  currentPromiseDate,
  currentPromiseNote,
  triggerLabel,
  className,
}: {
  personId: string;
  currentPromiseDate?: string | null;
  currentPromiseNote?: string | null;
  triggerLabel?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateVal, setDateVal] = useState(currentPromiseDate ?? "");
  const [noteVal, setNoteVal] = useState(currentPromiseNote ?? "");
  const { t } = useLanguage();

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    setPromiseToPay,
    {}
  );

  const [clearState, clearAction, isClearPending] = useActionState<
    ActionState,
    FormData
  >(clearPromiseToPay, {});

  useEffect(() => {
    if (state.ok || clearState.ok) {
      setIsOpen(false);
    }
  }, [state.ok, clearState.ok]);

  useEffect(() => {
    if (isOpen) {
      setDateVal(currentPromiseDate ?? "");
      setNoteVal(currentPromiseNote ?? "");
    }
  }, [isOpen, currentPromiseDate, currentPromiseNote]);

  function setRelativeDate(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = formatDateToIst(d) ?? "";
    setDateVal(dateStr);
  }

  function setNextFriday() {
    const d = new Date();
    const day = d.getDay(); // 0 is Sun, 5 is Fri
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setDateVal(formatDateToIst(d) ?? "");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
        }
      >
        <span aria-hidden="true">📅</span>
        <span>{triggerLabel || t("queue.setPromise")}</span>
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="promise-modal-title"
        descriptionId="promise-modal-description"
      >
        <DialogHeader>
          <div>
            <DialogTitle id="promise-modal-title">
              {t("promise.title")}
            </DialogTitle>
            <DialogDescription id="promise-modal-description">
              {t("promise.subtitle")}
            </DialogDescription>
          </div>
          <DialogCloseButton
            onClose={() => setIsOpen(false)}
            ariaLabel={t("common.close")}
          />
        </DialogHeader>

        <div className="overflow-y-auto flex flex-col gap-4 pt-3">
          {/* Shortcut Chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setRelativeDate(2)}
              className="rounded-full border border-rule bg-paper px-3 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
            >
              +2 days
            </button>
            <button
              type="button"
              onClick={() => setRelativeDate(3)}
              className="rounded-full border border-rule bg-paper px-3 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
            >
              +3 days
            </button>
            <button
              type="button"
              onClick={setNextFriday}
              className="rounded-full border border-rule bg-paper px-3 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
            >
              This Friday
            </button>
            <button
              type="button"
              onClick={() => setRelativeDate(7)}
              className="rounded-full border border-rule bg-paper px-3 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
            >
              +1 week
            </button>
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="personId" value={personId} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promiseDate">{t("promise.dateLabel")}</Label>
              <input
                id="promiseDate"
                type="date"
                name="promiseDate"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                required
                className={`${inputClass} font-mono text-xs`}
              />
              <FieldError message={state.fieldErrors?.promiseDate} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promiseNote">{t("promise.noteLabel")}</Label>
              <input
                id="promiseNote"
                type="text"
                name="note"
                maxLength={100}
                placeholder="e.g. Friday cash dega"
                value={noteVal}
                onChange={(e) => setNoteVal(e.target.value)}
                className={inputClass}
              />
              <FieldError message={state.fieldErrors?.note} />
            </div>

            {state.error ? (
              <p
                role="alert"
                className="rounded-xl border border-danger/20 bg-danger-light px-3 py-2 text-xs font-medium text-danger"
              >
                {state.error}
              </p>
            ) : null}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="submit"
                disabled={isPending || isClearPending}
                isLoading={isPending}
                className="flex-1 cursor-pointer"
              >
                {isPending ? t("entry.saving") : t("promise.save")}
              </Button>
            </div>
          </form>

          {currentPromiseDate && (
            <form action={clearAction} className="border-t border-rule/50 pt-2">
              <input type="hidden" name="personId" value={personId} />
              <button
                type="submit"
                disabled={isClearPending || isPending}
                className="w-full text-center text-xs font-semibold text-danger hover:underline py-1.5 cursor-pointer disabled:opacity-50"
              >
                {isClearPending ? "Clearing…" : t("promise.clear")}
              </button>
            </form>
          )}
        </div>
      </Dialog>
    </>
  );
}
