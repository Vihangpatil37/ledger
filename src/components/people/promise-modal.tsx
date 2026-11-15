"use client";

import { useActionState, useEffect, useState } from "react";
import { clearPromiseToPay, setPromiseToPay } from "@/actions/reminders";
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

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function setRelativeDate(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = d.toISOString().split("T")[0];
    setDateVal(dateStr);
  }

  function setNextFriday() {
    const d = new Date();
    const day = d.getDay(); // 0 is Sun, 5 is Fri
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setDateVal(d.toISOString().split("T")[0]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "inline-flex items-center gap-1.5 rounded-lg border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper transition-all cursor-pointer"
        }
      >
        <span>📅</span>
        <span>{triggerLabel || t("queue.setPromise")}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-rule bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-rule/50 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">
                  {t("promise.title")}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {t("promise.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-ink text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Shortcut Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setRelativeDate(2)}
                className="rounded-full border border-rule bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors"
              >
                +2 days
              </button>
              <button
                type="button"
                onClick={() => setRelativeDate(3)}
                className="rounded-full border border-rule bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors"
              >
                +3 days
              </button>
              <button
                type="button"
                onClick={setNextFriday}
                className="rounded-full border border-rule bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors"
              >
                This Friday
              </button>
              <button
                type="button"
                onClick={() => setRelativeDate(7)}
                className="rounded-full border border-rule bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors"
              >
                +1 week
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="personId" value={personId} />

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  {t("promise.dateLabel")}
                </label>
                <input
                  type="date"
                  name="promiseDate"
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  required
                  className="w-full rounded-xl border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-focus focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  {t("promise.noteLabel")}
                </label>
                <input
                  type="text"
                  name="note"
                  placeholder="e.g. Friday cash dega"
                  value={noteVal}
                  onChange={(e) => setNoteVal(e.target.value)}
                  className="w-full rounded-xl border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-focus focus:outline-none"
                />
              </div>

              {state.error && (
                <p className="text-xs text-debit font-medium">{state.error}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-rule/50">
                {currentPromiseDate ? (
                  <button
                    type="submit"
                    formAction={clearAction}
                    disabled={isClearPending}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    {isClearPending ? "Clearing…" : t("promise.clear")}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-rule px-3.5 py-2 text-xs font-semibold text-muted hover:bg-paper"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !dateVal}
                    className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink/90 disabled:opacity-50"
                  >
                    {isPending ? "Saving…" : t("promise.save")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
