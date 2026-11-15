export type DueStatus = "OVERDUE" | "DUE_TODAY" | "DUE_SOON" | "DUE_LATER" | null;

export type DueInfo = {
  status: DueStatus;
  label: string;
  className: string;
  daysDiff: number;
};

/**
 * Calculates humanized due status from a YYYY-MM-DD string or ISO timestamp.
 * Evaluated relative to Asia/Kolkata (IST), matching the server's overdue logic.
 */
export function getDueStatus(
  dueDateStr?: string | null,
  referenceDate?: Date
): DueInfo | null {
  if (!dueDateStr) return null;

  // Handles both YYYY-MM-DD and full ISO strings
  const [year, month, day] = dueDateStr.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return null;

  const dueUtc = Date.UTC(year, month - 1, day);
  if (isNaN(dueUtc)) return null;

  // Pin "today" to Asia/Kolkata so overdue checks are stable in IST,
  // matching readers.ts and not shifted by server UTC clock.
  const istTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(referenceDate ?? new Date());
  const [tYear, tMonth, tDay] = istTodayStr.split("-").map(Number);
  const todayUtc = Date.UTC(tYear, tMonth - 1, tDay);

  const diffMs = dueUtc - todayUtc;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: "OVERDUE",
      label: `Overdue by ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`,
      className: "bg-debit-light text-debit border border-debit/30",
      daysDiff: diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      status: "DUE_TODAY",
      label: "Due today",
      className: "bg-amber-500/10 text-amber-800 border border-amber-500/30",
      daysDiff: 0,
    };
  }

  if (diffDays <= 7) {
    return {
      status: "DUE_SOON",
      label: `Due in ${diffDays} ${diffDays === 1 ? "day" : "days"}`,
      className: "bg-focus-light text-focus border border-focus/30",
      daysDiff: diffDays,
    };
  }

  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(dueUtc));

  return {
    status: "DUE_LATER",
    label: `Due ${formatted}`,
    className: "bg-paper text-muted border border-rule",
    daysDiff: diffDays,
  };
}

/** Returns a localized or default human-readable label for a due status badge. */
export function formatDueLabel(
  info: DueInfo,
  t?: (key: "due.overdue" | "due.today" | "due.soon") => string
): string {
  if (!t) return info.label;
  if (info.status === "OVERDUE") {
    const days = Math.abs(info.daysDiff);
    return `${t("due.overdue")} (${days}d)`;
  }
  if (info.status === "DUE_TODAY") {
    return t("due.today");
  }
  if (info.status === "DUE_SOON") {
    return `${t("due.soon")} (${info.daysDiff}d)`;
  }
  return info.label;
}

/** Returns true if the date is strictly in the past (before today in Asia/Kolkata). */
export function isOverdueDate(
  dueDateStr?: string | null,
  referenceDate?: Date
): boolean {
  const info = getDueStatus(dueDateStr, referenceDate);
  return info?.status === "OVERDUE";
}
