import type { EntryType, ReliabilityScore, ReliabilityTier } from "@/lib/types";

export type ReliabilityEntryInput = {
  type: EntryType;
  amountCents: number;
  createdAt: Date | string;
  dueDate?: Date | string | null;
};

export type ReliabilityInput = {
  entries: ReliabilityEntryInput[];
  brokenPromisesCount?: number;
  referenceDate?: Date;
};

/**
 * Computes deterministic customer reliability score (0-100) and tier based on:
 * 1. On-time repayment rate (matching payments against loans via chronological FIFO).
 * 2. Average repayment turnaround in days.
 * 3. Broken promise penalty (-15 points per broken promise).
 */
export function computeReliabilityScore(input: ReliabilityInput): ReliabilityScore {
  const { entries, brokenPromisesCount = 0, referenceDate = new Date() } = input;

  if (entries.length === 0) {
    return {
      score: 100,
      tier: "NEW",
      label: "New",
      onTimeRate: 100,
      avgRepayDays: 0,
      totalSettledCount: 0,
      brokenPromisesCount,
    };
  }

  // Sort chronological (oldest first)
  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  type OpenLoan = {
    amountCents: number;
    unpaidCents: number;
    createdAt: Date;
    dueDate: Date | null;
  };

  const openLoans: OpenLoan[] = [];
  let settledCount = 0;
  let onTimeCount = 0;
  let totalTurnaroundDays = 0;

  for (const entry of sorted) {
    const entryDate = new Date(entry.createdAt);

    if (entry.type === "GAVE") {
      const due = entry.dueDate ? new Date(entry.dueDate) : null;
      openLoans.push({
        amountCents: entry.amountCents,
        unpaidCents: entry.amountCents,
        createdAt: entryDate,
        dueDate: due,
      });
    } else if (entry.type === "RECEIVED") {
      let paymentLeft = entry.amountCents;

      for (const loan of openLoans) {
        if (loan.unpaidCents <= 0) continue;

        const applied = Math.min(paymentLeft, loan.unpaidCents);
        loan.unpaidCents -= applied;
        paymentLeft -= applied;

        // If this payment completely settled this loan
        if (loan.unpaidCents === 0) {
          settledCount += 1;
          const diffMs = entryDate.getTime() - loan.createdAt.getTime();
          const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          totalTurnaroundDays += days;

          // Check if settled on time
          if (loan.dueDate) {
            const dueEndMs = new Date(loan.dueDate).getTime() + 86_399_999;
            if (entryDate.getTime() <= dueEndMs) {
              onTimeCount += 1;
            }
          } else {
            // No due date set: default counts as on-time
            onTimeCount += 1;
          }
        }

        if (paymentLeft <= 0) break;
      }
    }
  }

  // Check open loans that are already overdue past referenceDate
  const refTime = referenceDate.getTime();
  let overdueOpenLoans = 0;
  for (const loan of openLoans) {
    if (loan.unpaidCents > 0 && loan.dueDate) {
      const dueEndMs = new Date(loan.dueDate).getTime() + 86_399_999;
      if (refTime > dueEndMs) {
        overdueOpenLoans += 1;
      }
    }
  }

  // If there are fewer than 2 settled transactions and no overdue loans, classify as NEW
  if (settledCount < 2 && overdueOpenLoans === 0) {
    return {
      score: 100,
      tier: "NEW",
      label: "New",
      onTimeRate: 100,
      avgRepayDays: settledCount > 0 ? Math.round(totalTurnaroundDays / settledCount) : 0,
      totalSettledCount: settledCount,
      brokenPromisesCount,
    };
  }

  const totalEvaluated = settledCount + overdueOpenLoans;
  const onTimeRate =
    totalEvaluated > 0 ? Math.round((onTimeCount / totalEvaluated) * 100) : 100;
  const avgRepayDays =
    settledCount > 0
      ? Math.round((totalTurnaroundDays / settledCount) * 10) / 10
      : 0;

  // Turnaround speed scoring (0-100)
  let turnaroundScore = 100;
  if (avgRepayDays <= 7) turnaroundScore = 100;
  else if (avgRepayDays <= 15) turnaroundScore = 85;
  else if (avgRepayDays <= 30) turnaroundScore = 70;
  else if (avgRepayDays <= 60) turnaroundScore = 50;
  else turnaroundScore = 30;

  // 60% weight on-time percentage, 40% speed, -15 penalty per broken promise
  const rawScore =
    Math.round(0.6 * onTimeRate + 0.4 * turnaroundScore) - brokenPromisesCount * 15;
  const score = Math.max(0, Math.min(100, rawScore));

  let tier: ReliabilityTier = "MODERATE";
  let label = "Moderate";
  if (score >= 85) {
    tier = "EXCELLENT";
    label = "Excellent";
  } else if (score < 60) {
    tier = "RISKY";
    label = "Risky";
  }

  return {
    score,
    tier,
    label,
    onTimeRate,
    avgRepayDays,
    totalSettledCount: settledCount,
    brokenPromisesCount,
  };
}
