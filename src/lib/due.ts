export type DueStatus = "OVERDUE" | "DUE_TODAY" | "DUE_SOON" | "DUE_LATER" | null;

export type DueInfo = {
  status: DueStatus;
  label: string;
  className: string;
  daysDiff: number;
};

/**
 * Calculates humanized due status from a YYYY-MM-DD string or ISO timestamp.
 */
export function getDueStatus(dueDateStr?: string | null): DueInfo | null {
  if (!dueDateStr) return null;

  // Handles both YYYY-MM-DD and full ISO strings
  const [year, month, day] = dueDateStr.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return null;

  const due = new Date(year, month - 1, day);
  if (isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
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

  const formatted = due.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return {
    status: "DUE_LATER",
    label: `Due ${formatted}`,
    className: "bg-paper text-muted border border-rule",
    daysDiff: diffDays,
  };
}

/** Returns true if the date is strictly in the past (before today). */
export function isOverdueDate(dueDateStr?: string | null): boolean {
  const info = getDueStatus(dueDateStr);
  return info?.status === "OVERDUE";
}

