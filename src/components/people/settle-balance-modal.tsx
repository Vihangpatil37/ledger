"use client";

import { useActionState, useEffect, useState } from "react";
import { addEntry } from "@/actions/entries";
import { Button, FieldError, Label, Money, inputClass } from "@/components/ui";
import type { ActionState, PersonDetail } from "@/lib/types";

export function SettleBalanceModal({ detail }: { detail: PersonDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const balanceVal = Number(detail.balance);
  const isSettled = balanceVal === 0;

  // If balance > 0 (they owe you), settling means you RECEIVED the money.
  // If balance < 0 (you owe them), settling means you GAVE the money back.
  const isOwesYou = balanceVal > 0;
  const settleType = isOwesYou ? "RECEIVED" : "GAVE";
  const exactAmount = detail.balance.replace(/^-/, "");

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addEntry,
    {}
  );

  // Close modal when entry is successfully saved
  useEffect(() => {
    if (state.ok) {
      setIsOpen(false);
    }
  }, [state]);

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

  if (isSettled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-[0_2px_4px_0_rgba(30,27,24,0.15)] transition-all duration-150 hover:bg-ink/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus cursor-pointer"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0 text-credit-light"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Settle up</span>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settle-modal-title"
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
                  id="settle-modal-title"
                  className="font-display text-lg font-bold tracking-tight text-ink"
                >
                  Settle Balance
                </h3>
                <p className="font-mono text-xs text-muted">
                  With {detail.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Overview Banner */}
            <div className="my-4 rounded-xl border border-rule bg-paper/70 p-3.5 text-center">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted block">
                {isOwesYou ? "Pending to collect" : "Pending to return"}
              </span>
              <Money
                amount={exactAmount}
                className="mt-1 block text-2xl font-bold font-mono tracking-tight text-ink"
              />
              <span className="mt-1 block text-xs text-muted">
                {isOwesYou
                  ? "Recording this payment will mark their account settled."
                  : "Recording this payment will mark your account settled."}
              </span>
            </div>

            {/* Settle Form */}
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="personId" value={detail.id} />
              <input type="hidden" name="type" value={settleType} />

              <div className="space-y-1.5">
                <Label htmlFor="settle-amount">Settlement amount (₹)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-muted">
                    ₹
                  </span>
                  <input
                    id="settle-amount"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    defaultValue={exactAmount}
                    required
                    className={`${inputClass} pl-8 font-mono font-bold tracking-tight`}
                  />
                </div>
                <FieldError message={state.fieldErrors?.amount} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settle-note">Note / Payment method</Label>
                <input
                  id="settle-note"
                  name="note"
                  type="text"
                  maxLength={200}
                  defaultValue="Full account settlement"
                  placeholder="e.g. Paid via UPI / GPay / Cash"
                  className={inputClass}
                />
                <FieldError message={state.fieldErrors?.note} />
              </div>

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
                  className="w-full flex-1"
                >
                  {pending ? "Recording settlement…" : `Confirm & Settle`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
