import type { PersonDetail } from "@/lib/types";

/**
 * Sanitizes free-text fields to prevent CSV / Spreadsheet formula injection.
 * If a text string starts with =, +, -, @, \t, or \r (including leading whitespace),
 * it is prefixed with a single quote (').
 *
 * NOTE: NEVER apply this to numeric columns! Negative numbers like "-150.00"
 * must remain un-prefixed so spreadsheet engines parse them as numbers.
 */
export function sanitizeTextForCsv(value?: string | null): string {
  if (!value) return "";
  const str = String(value);
  if (/^\s*[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/** Escapes a CSV cell according to RFC 4180 rules. */
export function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Builds an RFC 4180 compliant CSV statement string with UTF-8 BOM.
 */
export function buildStatementCsv(
  detail: PersonDetail,
  limit?: number
): string {
  const entriesToShow =
    typeof limit === "number" && limit > 0
      ? detail.entries.slice(0, limit)
      : detail.entries;

  // Print entries in chronological order (oldest first) so running balance builds up
  const chronological = [...entriesToShow].reverse();

  const lines: string[] = [];

  // Summary Metadata block
  const generatedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  lines.push(`${escapeCsvCell(`Ledger Statement: ${sanitizeTextForCsv(detail.name)}`)}`);
  lines.push(`${escapeCsvCell(`Generated: ${generatedDate}`)}`);
  lines.push(`${escapeCsvCell(`Total Given: ${detail.gaveTotal}`)},${escapeCsvCell(`Total Received: ${detail.receivedTotal}`)}`);
  lines.push(`${escapeCsvCell(`Net Balance: ${detail.balance}`)}`);

  if (detail.openingBalance !== undefined && detail.openingBalance !== null) {
    lines.push(`${escapeCsvCell(`Opening Balance: ${detail.openingBalance}`)}`);
  }
  lines.push(""); // Empty separator row

  // Table Headers
  lines.push(
    [
      escapeCsvCell("Date (IST)"),
      escapeCsvCell("Type"),
      escapeCsvCell("Amount (INR)"),
      escapeCsvCell("Running Balance (INR)"),
      escapeCsvCell("Note"),
      escapeCsvCell("Due Date"),
      escapeCsvCell("Status"),
    ].join(",")
  );

  // Opening Balance Row (if date range filter was active)
  if (detail.openingBalance !== undefined && detail.openingBalance !== null) {
    lines.push(
      [
        escapeCsvCell("-"),
        escapeCsvCell("OPENING_BALANCE"),
        escapeCsvCell("0.00"),
        escapeCsvCell(detail.openingBalance),
        escapeCsvCell("Balance prior to selected date range"),
        escapeCsvCell("-"),
        escapeCsvCell("-"),
      ].join(",")
    );
  }

  // Transaction Rows
  for (const entry of chronological) {
    const istDate = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(entry.createdAt));

    const statusStr = entry.editedAt ? "Edited" : "Recorded";

    lines.push(
      [
        escapeCsvCell(istDate),
        escapeCsvCell(entry.type === "GAVE" ? "Udhar (Gave)" : "Received"),
        escapeCsvCell(entry.amount),
        escapeCsvCell(entry.running),
        escapeCsvCell(sanitizeTextForCsv(entry.note)),
        escapeCsvCell(entry.dueDate ?? "-"),
        escapeCsvCell(statusStr),
      ].join(",")
    );
  }

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for Microsoft Excel compatibility
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

/** Formats a clean, safe filename for statement download. */
export function statementCsvFilename(name: string, date?: Date): string {
  const safeName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "contact";
  const dateStr = date
    ? date.toISOString().split("T")[0]
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return `ledger-${safeName}-${dateStr}.csv`;
}
