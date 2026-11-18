"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalculationItem,
  evaluateExpression,
} from "@/lib/calculator";
import {
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/client";

const HISTORY_STORAGE_KEY = "chai_ledger_calculator_history";
const MAX_HISTORY_ITEMS = 30;

export function CalculatorModal({
  personName,
  triggerClassName,
  triggerLabel,
  customTrigger,
  onApplyAmount,
}: {
  personName?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  customTrigger?: (open: () => void) => React.ReactNode;
  onApplyAmount?: (amount: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState("");
  const [currentValue, setCurrentValue] = useState("0");
  const [history, setHistory] = useState<CalculationItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isNewEntry, setIsNewEntry] = useState(true);
  const { t } = useLanguage();

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch {
      // LocalStorage access might be restricted; ignore silently
    }
  }, []);

  const saveHistory = useCallback((items: CalculationItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, []);

  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  // Handle digit or decimal input
  const handleDigit = useCallback(
    (digit: string) => {
      setCopied(false);
      if (isNewEntry) {
        if (digit === ".") {
          setCurrentValue("0.");
        } else {
          setCurrentValue(digit);
        }
        setIsNewEntry(false);
        return;
      }

      if (digit === ".") {
        if (currentValue.includes(".")) return;
        setCurrentValue((prev) => prev + ".");
        return;
      }

      if (currentValue === "0") {
        setCurrentValue(digit);
      } else {
        setCurrentValue((prev) => prev + digit);
      }
    },
    [currentValue, isNewEntry]
  );

  // Handle operator (+, -, ×, ÷, %)
  const handleOperator = useCallback(
    (op: string) => {
      setCopied(false);
      if (op === "%") {
        const fullExpr = expression ? `${expression} ${currentValue}%` : `${currentValue}%`;
        const evalResult = evaluateExpression(fullExpr);
        if (evalResult.ok && evalResult.formatted !== undefined) {
          setCurrentValue(evalResult.formatted);
          setExpression(fullExpr);
          setIsNewEntry(true);
        }
        return;
      }

      // If we already had an expression, evaluate intermediate running total
      if (expression && !isNewEntry) {
        const fullExpr = `${expression} ${currentValue}`;
        const evalResult = evaluateExpression(fullExpr);
        if (evalResult.ok && evalResult.formatted !== undefined) {
          setExpression(`${evalResult.formatted} ${op}`);
          setCurrentValue(evalResult.formatted);
          setIsNewEntry(true);
          return;
        }
      }

      setExpression(`${currentValue} ${op}`);
      setIsNewEntry(true);
    },
    [currentValue, expression, isNewEntry]
  );

  // Handle backspace
  const handleBackspace = useCallback(() => {
    setCopied(false);
    if (isNewEntry) {
      setCurrentValue("0");
      return;
    }

    if (currentValue.length <= 1) {
      setCurrentValue("0");
      setIsNewEntry(true);
    } else {
      setCurrentValue((prev) => prev.slice(0, -1));
    }
  }, [currentValue, isNewEntry]);

  // Handle clear all
  const handleClear = useCallback(() => {
    setExpression("");
    setCurrentValue("0");
    setIsNewEntry(true);
    setCopied(false);
  }, []);

  // Handle calculation evaluation (=)
  const handleEquals = useCallback(() => {
    if (!expression) return;

    const fullExpr = `${expression} ${currentValue}`;
    const evalResult = evaluateExpression(fullExpr);

    if (evalResult.ok && evalResult.formatted !== undefined) {
      const finalVal = evalResult.formatted;
      const historyItem: CalculationItem = {
        id: Math.random().toString(36).substring(2, 9),
        expression: fullExpr,
        result: finalVal,
        timestamp: Date.now(),
      };

      saveHistory([historyItem, ...history.slice(0, MAX_HISTORY_ITEMS - 1)]);
      setExpression("");
      setCurrentValue(finalVal);
      setIsNewEntry(true);
    } else {
      setCurrentValue("Error");
      setIsNewEntry(true);
    }
  }, [currentValue, expression, history, saveHistory]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [currentValue]);

  // Use as Amount in entry form
  const handleApply = useCallback(() => {
    const rawNum = parseFloat(currentValue);
    if (Number.isNaN(rawNum) || rawNum <= 0) {
      return;
    }

    const formattedAmount = rawNum.toFixed(2);

    if (onApplyAmount) {
      onApplyAmount(formattedAmount);
    }

    // Direct DOM insertion into the Add Entry amount field
    const input = document.getElementById("amount") as HTMLInputElement | null;
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(input, formattedAmount);
      } else {
        input.value = formattedAmount;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => input.focus(), 150);
    }

    // Broadcast event for custom receivers
    window.dispatchEvent(
      new CustomEvent("ledger:set-amount", { detail: { amount: formattedAmount } })
    );

    setIsOpen(false);
  }, [currentValue, onApplyAmount]);

  // Keyboard navigation when modal is open
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      // If typing inside an input/textarea inside the modal, do not intercept
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        handleDigit(".");
      } else if (e.key === "+") {
        e.preventDefault();
        handleOperator("+");
      } else if (e.key === "-") {
        e.preventDefault();
        handleOperator("-");
      } else if (e.key === "*" || e.key.toLowerCase() === "x") {
        e.preventDefault();
        handleOperator("×");
      } else if (e.key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "%") {
        e.preventDefault();
        handleOperator("%");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key.toLowerCase() === "c" || e.key === "Delete") {
        e.preventDefault();
        handleClear();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleDigit, handleOperator, handleEquals, handleBackspace, handleClear]);

  return (
    <>
      {customTrigger ? (
        customTrigger(() => setIsOpen(true))
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={
            triggerClassName ??
            "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rule bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-2xs transition-colors hover:bg-paper active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-focus cursor-pointer"
          }
        >
          {/* Calculator icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 text-muted"
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
          <span>{triggerLabel ?? t("calculator.openButton")}</span>
        </button>
      )}

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} glass className="sm:max-w-[380px] relative">
        {/* Top glass reflection highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent"
          aria-hidden="true"
        />

        <DialogHeader className="border-b border-white/20 dark:border-white/10 pb-2.5 sm:pb-3 shrink-0">
          <div className="min-w-0 pr-2">
            <DialogTitle className="font-sans font-bold text-base sm:text-lg tracking-tight text-ink dark:text-white flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4.5 text-focus shrink-0"
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
              <span>{t("calculator.title")}</span>
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-muted truncate mt-0.5">
              {personName ? `${personName} · ${t("calculator.subtitle")}` : t("calculator.subtitle")}
            </DialogDescription>
          </div>
          <DialogCloseButton onClose={() => setIsOpen(false)} />
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 justify-between gap-2.5 sm:gap-3 py-2.5 sm:py-3 overflow-y-auto scrollbar-none">
          {/* Display screen */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-white/25 dark:border-white/10 bg-black/[0.03] dark:bg-black/45 backdrop-blur-md p-3 min-h-[76px] sm:min-h-[86px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] overflow-hidden shrink-0">
            {/* Top row: Quick actions (Tape & Copy) + Expression */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowHistory((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-mono font-medium transition-all cursor-pointer border backdrop-blur-md ${
                    showHistory
                      ? "bg-focus text-white border-focus shadow-2xs"
                      : "border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/10 text-muted hover:text-ink dark:text-muted dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/20"
                  }`}
                  title={t("calculator.history")}
                >
                  <span>Tape ({history.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/10 px-2 py-0.5 text-[11px] font-mono text-muted hover:text-ink dark:text-muted dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer"
                  title={t("calculator.copy")}
                >
                  {copied ? t("calculator.copied") : t("calculator.copy")}
                </button>
              </div>

              {/* Expression line */}
              <div className="text-right font-mono text-xs text-muted truncate max-w-[170px]">
                {expression ? expression : "\u00A0"}
              </div>
            </div>

            {/* Current value display with grouped currency symbol */}
            <div
              aria-live="polite"
              className="flex items-baseline justify-end gap-1.5 overflow-x-auto scrollbar-none pt-1"
            >
              <span className="font-mono text-base sm:text-lg font-semibold text-muted/80 select-none">
                ₹
              </span>
              <span className="truncate text-right font-mono text-2xl sm:text-3xl font-bold tracking-tight text-ink dark:text-white">
                {currentValue}
              </span>
            </div>
          </div>

          {/* History Tape Drawer (if open) */}
          {showHistory ? (
            <div className="flex flex-col gap-1.5 rounded-2xl border border-white/25 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl p-2.5 max-h-[150px] overflow-y-auto text-xs animate-in fade-in duration-150 shadow-inner shrink-0">
              <div className="flex items-center justify-between pb-1 border-b border-white/20 dark:border-white/10 text-muted font-mono text-[11px]">
                <span>{t("calculator.history")}</span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-debit hover:underline cursor-pointer"
                  >
                    {t("calculator.clearHistory")}
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="py-3 text-center font-mono text-muted text-xs">
                  {t("calculator.noHistory")}
                </p>
              ) : (
                <ul className="divide-y divide-white/15 dark:divide-white/10 font-mono">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => {
                        setCurrentValue(item.result);
                        setIsNewEntry(true);
                        setShowHistory(false);
                      }}
                      className="flex items-center justify-between py-1 px-1 hover:bg-white/30 dark:hover:bg-white/10 rounded cursor-pointer transition-colors"
                      title="Click to load result"
                    >
                      <span className="text-muted truncate max-w-[180px]">
                        {item.expression} =
                      </span>
                      <span className="font-bold text-ink dark:text-white">
                        ₹{item.result}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {/* Keypad Grid */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 select-none touch-manipulation">
            {/* Row 1: AC, Backspace SVG, %, ÷ */}
            <button
              type="button"
              onClick={handleClear}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-debit/30 dark:border-debit/40 bg-debit/10 dark:bg-debit/20 hover:bg-debit/20 dark:hover:bg-debit/30 font-mono text-base font-bold text-debit dark:text-[#fca5a5] backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Clear all (Esc / C)"
            >
              AC
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-rule/80 dark:border-white/10 bg-surface dark:bg-white/[0.08] hover:bg-paper dark:hover:bg-white/[0.14] text-muted hover:text-ink dark:text-white/80 dark:hover:text-white backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Backspace"
              aria-label="Backspace"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5 shrink-0"
                aria-hidden="true"
              >
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleOperator("%")}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-focus/25 dark:border-focus/50 bg-focus/10 dark:bg-focus/25 hover:bg-focus/20 dark:hover:bg-focus/35 font-mono text-base font-bold text-focus dark:text-[#c7d2fe] backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Percentage"
            >
              %
            </button>
            <button
              type="button"
              onClick={() => handleOperator("÷")}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-focus/25 dark:border-focus/50 bg-focus/10 dark:bg-focus/25 hover:bg-focus/20 dark:hover:bg-focus/35 font-mono text-xl font-bold text-focus dark:text-[#c7d2fe] backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Divide (/)"
            >
              ÷
            </button>

            {/* Row 2: 7, 8, 9, × */}
            {["7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-rule/80 dark:border-white/10 bg-surface dark:bg-white/[0.08] hover:bg-paper dark:hover:bg-white/[0.14] font-mono text-xl font-semibold text-ink dark:text-white backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleOperator("×")}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-focus/25 dark:border-focus/50 bg-focus/10 dark:bg-focus/25 hover:bg-focus/20 dark:hover:bg-focus/35 font-mono text-xl font-bold text-focus dark:text-[#c7d2fe] backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Multiply (*)"
            >
              ×
            </button>

            {/* Row 3: 4, 5, 6, - */}
            {["4", "5", "6"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-rule/80 dark:border-white/10 bg-surface dark:bg-white/[0.08] hover:bg-paper dark:hover:bg-white/[0.14] font-mono text-xl font-semibold text-ink dark:text-white backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleOperator("-")}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-focus/25 dark:border-focus/50 bg-focus/10 dark:bg-focus/25 hover:bg-focus/20 dark:hover:bg-focus/35 font-mono text-xl font-bold text-focus dark:text-[#c7d2fe] backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Subtract (-)"
            >
              -
            </button>

            {/* Row 4: 1, 2, 3, + */}
            {["1", "2", "3"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-rule/80 dark:border-white/10 bg-surface dark:bg-white/[0.08] hover:bg-paper dark:hover:bg-white/[0.14] font-mono text-xl font-semibold text-ink dark:text-white backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleOperator("+")}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-focus/25 dark:border-focus/50 bg-focus/10 dark:bg-focus/25 hover:bg-focus/20 dark:hover:bg-focus/35 font-mono text-xl font-bold text-focus dark:text-[#c7d2fe] backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Add (+)"
            >
              +
            </button>

            {/* Row 5: 0, ., = */}
            <button
              type="button"
              onClick={() => handleDigit("0")}
              className="col-span-2 flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-rule/80 dark:border-white/10 bg-surface dark:bg-white/[0.08] hover:bg-paper dark:hover:bg-white/[0.14] font-mono text-xl font-semibold text-ink dark:text-white backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleDigit(".")}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl border border-rule/80 dark:border-white/10 bg-surface dark:bg-white/[0.08] hover:bg-paper dark:hover:bg-white/[0.14] font-mono text-xl font-bold text-ink dark:text-white backdrop-blur-md active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              .
            </button>
            <button
              type="button"
              onClick={handleEquals}
              className="flex min-h-[42px] sm:min-h-[46px] items-center justify-center rounded-xl bg-focus hover:bg-focus/90 border border-focus/60 font-mono text-xl font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
              title="Calculate (Enter / =)"
            >
              =
            </button>
          </div>
        </div>

        {/* Action button footer: Pinned at bottom and guaranteed visible */}
        <div className="pt-2 sm:pt-2.5 border-t border-white/20 dark:border-white/10 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleApply}
            className="w-full inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-ink dark:bg-white text-paper dark:text-black hover:bg-ink/90 dark:hover:bg-white/90 font-bold text-sm sm:text-base shadow-lg active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-focus border border-black/10 dark:border-white/20"
          >
            <span>{t("calculator.useAsAmount")}</span>
            <span className="font-mono text-xs sm:text-sm font-semibold opacity-85">(₹{currentValue})</span>
          </button>
        </div>
      </Dialog>
    </>
  );
}
