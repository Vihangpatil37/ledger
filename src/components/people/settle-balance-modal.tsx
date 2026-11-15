"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { addEntry } from "@/actions/entries";
import { Button, FieldError, Label, Money, inputClass } from "@/components/ui";
import { UpiQrCode } from "@/components/qr-code";
import { calculateSettleSplits, decimalStringToPaise, formatMoney } from "@/lib/money";
import { buildUpiPayUrl } from "@/lib/upi";
import { useLanguage } from "@/lib/i18n/client";
import type { ActionState, PersonDetail } from "@/lib/types";

export function SettleBalanceModal({ detail }: { detail: PersonDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const { t } = useLanguage();
  const balanceVal = Number(detail.balance);
  const isSettled = balanceVal === 0;

  // If balance > 0 (they owe you), settling means you RECEIVED the money.
  // If balance < 0 (you owe them), settling means you GAVE the money back.
  const isOwesYou = balanceVal > 0;
  const settleType = isOwesYou ? "RECEIVED" : "GAVE";
  const { fullAmount, halfAmount, halfPaise } = calculateSettleSplits(detail.balance);

  const [amount, setAmount] = useState(fullAmount);
  const [note, setNote] = useState("Full account settlement");

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

  // Lock background scroll when open and initialize presets
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setAmount(fullAmount);
      setNote("Full account settlement");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, fullAmount]);

  function handleSelectFull() {
    setAmount(fullAmount);
    setNote("Full account settlement");
  }

  function handleSelectHalf() {
    setAmount(halfAmount);
    setNote("Partial settlement (50%)");
  }

  const ownerUpiUrl =
    isOwesYou && detail.ownerUpi?.upiId
      ? buildUpiPayUrl({
          pa: detail.ownerUpi.upiId,
          pn: detail.ownerUpi.upiName ?? "Chai Ledger",
          amountCents: decimalStringToPaise(amount),
          tn: note || "Khata settlement",
        })
      : null;

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
        <span>{t("person.settleBalance")}</span>
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
                  {t("settle.title")}
                </h3>
                <p className="font-mono text-xs text-muted">
                  {detail.name}
                </p>
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

            {/* Overview Banner */}
            <div className="my-4 rounded-xl border border-rule bg-paper/70 p-3.5 text-center">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted block">
                {isOwesYou ? t("home.youllGet") : t("home.youllGive")}
              </span>
              <Money
                amount={fullAmount}
                className="mt-1 block text-2xl font-bold font-mono tracking-tight text-ink"
              />
            </div>

            {/* Settle Form */}
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="personId" value={detail.id} />
              <input type="hidden" name="type" value={settleType} />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="settle-amount">{t("settle.customAmount")} (₹)</Label>
                  <div className="inline-flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectFull}
                      className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                        amount === fullAmount
                          ? "border-ink bg-ink text-paper shadow-2xs"
                          : "border-rule bg-paper text-muted hover:text-ink"
                      }`}
                    >
                      {t("settle.fullOption")} ({formatMoney(fullAmount)})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectHalf}
                      disabled={halfPaise === 0}
                      className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                        amount === halfAmount
                          ? "border-ink bg-ink text-paper shadow-2xs"
                          : "border-rule bg-paper text-muted hover:text-ink"
                      }`}
                    >
                      {t("settle.halfOption")} ({formatMoney(halfAmount)})
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-muted">
                    ₹
                  </span>
                  <input
                    id="settle-amount"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className={`${inputClass} pl-8 font-mono font-bold tracking-tight`}
                  />
                </div>
                <FieldError message={state.fieldErrors?.amount} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settle-note">{t("settle.note")}</Label>
                <input
                  id="settle-note"
                  name="note"
                  type="text"
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("settle.notePlaceholder")}
                  className={inputClass}
                />
                <FieldError message={state.fieldErrors?.note} />
              </div>

              {/* UPI Action Section (when contact owes you) */}
              {isOwesYou ? (
                <div className="border-t border-rule/60 pt-3">
                  {ownerUpiUrl ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowQr(!showQr)}
                        className="inline-flex w-full items-center justify-between rounded-lg border border-rule bg-paper px-3 py-2 text-xs font-semibold text-ink hover:bg-surface transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5 text-focus">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                          <span>{showQr ? t("settle.hideQr") : t("settle.showQr")}</span>
                        </span>
                        <span className="font-mono text-[10px] text-muted">
                          {showQr ? "▲" : "▼"}
                        </span>
                      </button>

                      {showQr ? (
                        <div className="rounded-xl border border-rule bg-surface p-3 text-center space-y-2 animate-in fade-in duration-150">
                          <div className="flex justify-center">
                            <UpiQrCode upiUrl={ownerUpiUrl} size={150} />
                          </div>
                          <p className="font-mono text-[11px] font-semibold text-ink">
                            UPI ID: {detail.ownerUpi?.upiId}
                          </p>
                          <p className="text-[10px] text-muted">
                            {t("settle.qrInstruction")}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-rule bg-paper/50 px-3 py-2 text-center text-xs text-muted">
                      {t("settle.noOwnerUpi")}{" "}
                      <Link href="/settings" className="font-semibold text-focus hover:underline">
                        {t("settle.setUpiInSettings")}
                      </Link>
                    </div>
                  )}
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
                  className="w-full flex-1"
                >
                  {pending ? t("settle.recording") : t("settle.confirmBtn")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="w-full sm:w-auto"
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
