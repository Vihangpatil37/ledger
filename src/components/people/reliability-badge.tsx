"use client";

import { useEffect, useState } from "react";
import type { ReliabilityScore } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/client";

export function ReliabilityBadge({
  score,
  compact = false,
}: {
  score?: ReliabilityScore;
  compact?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!showDetails) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowDetails(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDetails]);

  if (!score) return null;

  let bgClass = "bg-paper text-muted border-rule";
  let dotClass = "bg-muted";

  if (score.tier === "EXCELLENT") {
    bgClass = "bg-credit-light text-credit border-credit/30";
    dotClass = "bg-credit";
  } else if (score.tier === "MODERATE") {
    bgClass = "bg-warning-light text-warning border-warning/30";
    dotClass = "bg-warning";
  } else if (score.tier === "RISKY") {
    bgClass = "bg-debit-light text-debit border-debit/30";
    dotClass = "bg-debit";
  }

  const localizedTier =
    score.tier === "EXCELLENT"
      ? t("reliability.excellent")
      : score.tier === "MODERATE"
        ? t("reliability.moderate")
        : score.tier === "RISKY"
          ? t("reliability.risky")
          : t("reliability.new");

  const sizeClass = compact ? "px-2 py-0 text-[10px]" : "px-2.5 py-0.5 text-xs";

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        aria-expanded={showDetails}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClass} font-semibold font-mono transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-focus ${bgClass}`}
        title={`${t("reliability.title")}: ${score.score}/100`}
      >
        <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
        <span>
          {score.tier === "NEW" ? localizedTier : `${score.score} · ${localizedTier}`}
        </span>
      </button>

      {showDetails && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          <div
            role="dialog"
            aria-label={t("reliability.title")}
            className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 z-50 w-64 rounded-2xl border border-rule bg-surface p-4 shadow-xl flex flex-col gap-2.5 text-xs animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-rule/50 pb-2">
              <span className="font-bold text-ink">{t("reliability.title")}</span>
              <span className="font-mono font-bold text-ink">{score.score}/100</span>
            </div>
            <div className="flex flex-col gap-1.5 text-muted">
              <div className="flex justify-between">
                <span>{t("reliability.onTime")}:</span>
                <span className="font-mono font-semibold text-ink">{score.onTimeRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>{t("reliability.avgDays")}:</span>
                <span className="font-mono font-semibold text-ink">{score.avgRepayDays}d</span>
              </div>
              <div className="flex justify-between">
                <span>Settled loans:</span>
                <span className="font-mono font-semibold text-ink">{score.totalSettledCount}</span>
              </div>
              {score.brokenPromisesCount > 0 && (
                <div className="flex justify-between text-debit">
                  <span>Broken promises:</span>
                  <span className="font-mono font-bold">
                    -{score.brokenPromisesCount * 15} pts ({score.brokenPromisesCount})
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
