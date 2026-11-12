import { getDueStatus, isOverdueDate } from "@/lib/due";
import { formatWhen } from "@/lib/format";
import { balanceMeta, formatMoney } from "@/lib/money";
import type { PersonDetail } from "@/lib/types";

/**
 * WhatsApp and Statement sharing helpers.
 */

/**
 * Normalizes a stored phone into wa.me digits. Local 10-digit numbers
 * get the default country code (India); "0"-prefixed trunk codes are
 * stripped; already-international numbers pass through.
 */
export function normalizeWaPhone(
  phone: string,
  defaultCode = "91"
): string | null {
  const digits = phone.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 10) return defaultCode + digits;
  if (digits.length === 11 && digits.startsWith("0")) {
    return defaultCode + digits.slice(1);
  }
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/** Hinglish payment reminder built from the person's ledger totals. */
export function reminderMessage(detail: PersonDetail): string {
  // Check if any active Udhar entry is overdue
  const overdueEntries = detail.entries.filter(
    (e) => e.type === "GAVE" && e.dueDate && isOverdueDate(e.dueDate)
  );

  let overdueNotice = "";
  if (overdueEntries.length > 0) {
    const oldestDue = overdueEntries[overdueEntries.length - 1].dueDate;
    const dueInfo = getDueStatus(oldestDue);
    if (dueInfo) {
      overdueNotice = `⚠️ Wada tha: ${oldestDue} tak (${dueInfo.label})\n`;
    }
  }

  return [
    `Namaste ${detail.name} ji 🙏`,
    "",
    `Aapke khate mein *${formatMoney(detail.balance)}* baaki hai.`,
    overdueNotice ? overdueNotice.trim() : null,
    `(Total diye gaye: ${formatMoney(detail.gaveTotal)} · Total wapas mile: ${formatMoney(detail.receivedTotal)})`,
    "",
    "Kripya jaldi payment kar dijiye 🙏",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/**
 * Builds a clean, human-readable ledger statement message with transaction history.
 * Suitable for WhatsApp, Telegram, SMS, or clipboard copy.
 */
export function formatStatementMessage(
  detail: PersonDetail,
  limit?: number
): string {
  const entriesToShow =
    typeof limit === "number" && limit > 0
      ? detail.entries.slice(0, limit)
      : detail.entries;

  const meta = balanceMeta(detail.balance);
  const now = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const lines: string[] = [
    `📒 *Ledger Statement: ${detail.name}*`,
    `Generated: ${now}`,
    `--------------------------------`,
    `Current Balance: *${formatMoney(Math.abs(Number(detail.balance)))}* (${meta.label})`,
    `Total Given: ${formatMoney(detail.gaveTotal)} | Total Received: ${formatMoney(detail.receivedTotal)}`,
    `--------------------------------`,
    `*Transaction History:*`,
  ];

  if (entriesToShow.length === 0) {
    lines.push(`(No transactions recorded yet)`);
  } else {
    for (const entry of entriesToShow) {
      const typeStr = entry.type === "GAVE" ? "Udhar" : "Received";
      const noteStr = entry.note ? ` - ${entry.note}` : "";
      const dueStr = entry.dueDate ? ` [Due: ${entry.dueDate}]` : "";
      const dateStr = formatWhen(entry.createdAt);
      lines.push(`• ${dateStr}: ${typeStr} ${formatMoney(entry.amount)}${noteStr}${dueStr}`);
    }
  }

  if (typeof limit === "number" && limit > 0 && detail.entries.length > limit) {
    lines.push(`... and ${detail.entries.length - limit} earlier transactions`);
  }

  lines.push(`--------------------------------`);
  lines.push(`_Shared via Ledger_`);

  return lines.join("\n");
}

/** Click-to-chat link; `waNumber` comes from normalizeWaPhone. */
export function waLink(waNumber: string, message: string): string {
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Universal WhatsApp share link: if number is present, directs to that chat;
 * otherwise opens WhatsApp app with message pre-filled to select any contact.
 */
export function universalWaLink(message: string, waNumber?: string | null): string {
  if (waNumber) {
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
