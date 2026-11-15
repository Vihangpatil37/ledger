"use client";

import { useState } from "react";
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

  if (!score) return null;

  let bgClass = "bg-paper text-muted border-rule";
  let dotClass = "bg-muted";

  if (score.tier === "EXCELLENT") {
    bgClass = "bg-emerald-500/10 text-emerald-800 border-emerald-500/30";
    dotClass = "bg-emerald-600";
  } else if (score.tier === "MODERATE") {
    bgClass = "bg-amber-500/10 text-amber-800 border-amber-500/30";
    dotClass = "bg-amber-600";
  } else if (score.tier === "RISKY") {
    bgClass = "bg-rose-500/10 text-rose-800 border-rose-500/30";
    dotClass = "bg-rose-600";
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
        className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClass} font-semibold font-mono transition-transform hover:scale-[1.02] active:scale-[0.98] ${bgClass}`}
        title={`${t("reliability.title")}: ${score.score}/100`}
      >
        <span className={`size-1.5 rounded-full ${dotClass}`} />
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
          <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 z-50 w-64 rounded-xl border border-rule bg-surface p-3.5 shadow-lg space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-rule/50 pb-2">
              <span className="font-bold text-ink">{t("reliability.title")}</span>
              <span className="font-mono font-bold text-ink">{score.score}/100</span>
            </div>
            <div className="space-y-1.5 text-muted">
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
                <div className="flex justify-between text-rose-600">
                  <span>Broken promises:</span>
                  <span className="font-mono font-bold">-{score.brokenPromisesCount * 15} pts ({score.brokenPromisesCount})</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
