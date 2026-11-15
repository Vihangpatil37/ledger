import { getDueStatus, isOverdueDate } from "@/lib/due";
import { formatWhen } from "@/lib/format";
import { decimalStringToPaise, formatMoney } from "@/lib/money";
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
  const totalReceivedCents = decimalStringToPaise(detail.receivedTotal);

  // Check if any active Udhar entry is overdue
  const overdueEntries = detail.entries.filter(
    (e) => e.type === "GAVE" && e.dueDate && isOverdueDate(e.dueDate)
  );

  const totalOverdueGaveCents = overdueEntries.reduce(
    (sum, e) => sum + decimalStringToPaise(e.amount),
    0
  );

  let overdueNotice = "";
  // An overdue notice is only included if total overdue loans exceed total repayments
  if (totalOverdueGaveCents > totalReceivedCents) {
    // Sort chronological (oldest dueDate / createdAt first) to identify the oldest un-repaid debt
    const sortedOverdue = [...overdueEntries].sort((a, b) => {
      const dueComp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      if (dueComp !== 0) return dueComp;
      return a.createdAt.localeCompare(b.createdAt);
    });

    let coveredCents = totalReceivedCents;
    let oldestUnrepaid = sortedOverdue[0];

    for (const entry of sortedOverdue) {
      const entryCents = decimalStringToPaise(entry.amount);
      if (coveredCents >= entryCents) {
        coveredCents -= entryCents;
      } else {
        oldestUnrepaid = entry;
        break;
      }
    }

    if (oldestUnrepaid?.dueDate) {
      const dueInfo = getDueStatus(oldestUnrepaid.dueDate);
      if (dueInfo) {
        overdueNotice = `⚠️ *Overdue:* ${oldestUnrepaid.dueDate} tak wada tha (${dueInfo.label})`;
      }
    }
  }

  const customerName = detail.name?.trim() || detail.name;
  const ownerName = detail.ownerUpi?.upiName?.trim() || undefined;
  const upiId = detail.ownerUpi?.upiId?.trim() || undefined;

  const sections: string[] = [];

  // 1. Header with optional shop / owner branding
  const header = ownerName
    ? `📋 *Khata Reminder* · ${ownerName}`
    : `📋 *Khata Reminder*`;
  sections.push(header);

  // 2. Polite salutation & overview
  sections.push(`Namaste *${customerName}* ji,\nAapke khate ka taaza hisab:`);

  // 3. Balance & Totals (and overdue notice if applicable)
  const balanceLines = [
    `💰 *Baaki Udhar:* *${formatMoney(detail.balance)}*`,
    `📊 Kul Udhar: ${formatMoney(detail.gaveTotal)} | Kul Jama: ${formatMoney(detail.receivedTotal)}`,
  ];
  if (overdueNotice) {
    balanceLines.push(overdueNotice);
  }
  sections.push(balanceLines.join("\n"));

  // 4. Online payment details (only if UPI ID is present and balance is positive)
  if (upiId && Number(detail.balance) > 0) {
    const upiLines = [
      `💳 *Online Payment ke liye:*`,
      `UPI ID: *${upiId}*`,
    ];
    if (ownerName) {
      upiLines.push(`Naam: ${ownerName}`);
    }
    upiLines.push(
      `_(Google Pay, PhonePe, Paytm ya kisi bhi UPI app se pay kar sakte hain)_`
    );
    sections.push(upiLines.join("\n"));
  }

  // 5. Professional & courteous closing
  const closingLines = [
    "Kripya baaki rashi ka bhugtan samay par karein aur khata update rakhein.",
    "Kisi bhi sawal ke liye sampark karein.",
    "Dhanyawad!",
  ];
  if (ownerName) {
    closingLines.push(`— *${ownerName}*`);
  }
  sections.push(closingLines.join("\n"));

  return sections.join("\n\n");
}

/**
 * Builds a clean, human-readable ledger statement message with transaction history.
 * Suitable for WhatsApp, Telegram, SMS, or clipboard copy.
 */
export function formatStatementMessage(
  detail: PersonDetail,
  limit?: number
): string {
  const customerName = detail.name?.trim() || detail.name;
  const ownerName = detail.ownerUpi?.upiName?.trim() || undefined;
  const upiId = detail.ownerUpi?.upiId?.trim() || undefined;

  const entriesToShow =
    typeof limit === "number" && limit > 0
      ? detail.entries.slice(0, limit)
      : detail.entries;

  const balVal = Number(detail.balance);
  const absVal = Math.abs(Number.isFinite(balVal) ? balVal : 0);
  let statusHinglish = "Chukte (Settled)";
  if (balVal > 0) {
    statusHinglish = "Baaki Udhar (Lene baaki)";
  } else if (balVal < 0) {
    statusHinglish = "Advance Deposit (Jama rashi)";
  }

  const now = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const separator = "━━━━━━━━━━━━━━━━━━━━";

  const lines: string[] = [
    `📒 *Khata Statement: ${customerName}*`,
    `Tarikh: ${now}`,
  ];

  if (ownerName) {
    lines.push(`Dukan / Malik: ${ownerName}`);
  }

  lines.push(separator);
  lines.push(`💰 *Net Balance:* *${formatMoney(absVal)}* (${statusHinglish})`);
  lines.push(
    `📊 Kul Udhar: ${formatMoney(detail.gaveTotal)} | Kul Jama: ${formatMoney(detail.receivedTotal)}`
  );

  if (detail.openingBalance !== undefined && detail.openingBalance !== null) {
    lines.push(
      `Opening Balance: ${formatMoney(detail.openingBalance)} (Pichhla Baaki)`
    );
  }

  lines.push(separator);
  lines.push(`📋 *Pichhle Vyavahar (Transaction History):*`);

  if (entriesToShow.length === 0) {
    lines.push(`(Koi vyavahar darj nahi hai)`);
  } else {
    for (const entry of entriesToShow) {
      const typeStr = entry.type === "GAVE" ? "Udhar" : "Jama";
      const noteStr = entry.note ? ` - ${entry.note}` : "";
      const dueStr = entry.dueDate ? ` [Due: ${entry.dueDate}]` : "";
      const dateStr = formatWhen(entry.createdAt);
      lines.push(
        `• ${dateStr}: ${typeStr} ${formatMoney(entry.amount)}${noteStr}${dueStr}`
      );
    }
  }

  if (typeof limit === "number" && limit > 0 && detail.entries.length > limit) {
    lines.push(`... aur ${detail.entries.length - limit} pichhle vyavahar`);
  }

  lines.push(separator);

  if (upiId) {
    const upiNameSuffix = ownerName ? ` (${ownerName})` : "";
    lines.push(`💳 *UPI ID:* ${upiId}${upiNameSuffix}`);
  }

  lines.push(`_Shared via Chai Ledger_`);

  return lines.join("\n");
}

/** Click-to-chat link; delegates to universalWaLink. */
export function waLink(waNumber: string, message: string): string {
  return universalWaLink(message, waNumber);
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
