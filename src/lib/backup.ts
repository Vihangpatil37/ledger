import { sanitizeTextForCsv } from "@/lib/csv";
import { decimalStringToPaise, paiseToDecimalString } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import type {
  BackupPayload,
  CsvImportPreview,
  CsvImportRowPreview,
  EntryType,
} from "@/lib/types";

export function validateBackupPayload(
  data: unknown
): { ok: true; data: BackupPayload } | { ok: false; error: string } {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid backup payload format." };
  }

  const payload = data as Partial<BackupPayload>;
  if (payload.version !== "chai_ledger_backup_v2") {
    return {
      ok: false,
      error: `Unsupported backup version: ${payload.version ?? "unknown"}. Expected chai_ledger_backup_v2.`,
    };
  }

  if (!payload.owner || typeof payload.owner.email !== "string") {
    return { ok: false, error: "Missing or invalid owner information in backup." };
  }

  if (!Array.isArray(payload.people)) {
    return { ok: false, error: "Invalid backup: people must be an array." };
  }

  if (!Array.isArray(payload.entries)) {
    return { ok: false, error: "Invalid backup: entries must be an array." };
  }

  return { ok: true, data: payload as BackupPayload };
}

/** Parses RFC 4180 CSV line into fields respecting quotes. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/** Normalizes entry type from various language / khata terms. */
function normalizeEntryType(val: string): EntryType | null {
  const lower = val.trim().toLowerCase();
  if (["gave", "udhar", "debit", "diya", "out"].includes(lower)) {
    return "GAVE";
  }
  if (["received", "jama", "credit", "liya", "in", "payment"].includes(lower)) {
    return "RECEIVED";
  }
  return null;
}

export type ExistingContactInfo = {
  id: string;
  name: string;
  phone: string | null;
};

/**
 * Parses and validates an uploaded CSV file from a paper khata or export.
 * Produces a full dry-run preview before committing to the database.
 */
export function parseCsvKhata(
  csvText: string,
  existingPeople: ExistingContactInfo[]
): CsvImportPreview {
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (rawLines.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      newPeopleCount: 0,
      existingPeopleCount: 0,
      rows: [],
    };
  }

  const headerFields = parseCsvLine(rawLines[0]).map((h) =>
    h.toLowerCase().replace(/[\s_\-]/g, "")
  );

  const colIdx = {
    name: headerFields.findIndex((h) =>
      ["name", "customer", "party", "person", "client"].includes(h)
    ),
    phone: headerFields.findIndex((h) =>
      ["phone", "mobile", "contact", "phonenumber"].includes(h)
    ),
    type: headerFields.findIndex((h) =>
      ["type", "entrytype", "txntype", "transactiontype"].includes(h)
    ),
    amount: headerFields.findIndex((h) =>
      ["amount", "rupees", "inr", "value", "paise"].includes(h)
    ),
    note: headerFields.findIndex((h) =>
      ["note", "description", "details", "item", "remarks"].includes(h)
    ),
    dueDate: headerFields.findIndex((h) =>
      ["duedate", "due", "wada", "repaymentdate"].includes(h)
    ),
    date: headerFields.findIndex((h) =>
      ["date", "createdat", "txndate", "entrydate"].includes(h)
    ),
  };

  // Fallback defaults if no header matched
  if (colIdx.name === -1) colIdx.name = 0;
  if (colIdx.type === -1) colIdx.type = 1;
  if (colIdx.amount === -1) colIdx.amount = 2;

  // Build lookup index for existing contacts
  const byPhone = new Map<string, ExistingContactInfo>();
  const byName = new Map<string, ExistingContactInfo>();

  for (const p of existingPeople) {
    if (p.phone) {
      const norm = normalizePhone(p.phone);
      if (norm) byPhone.set(norm, p);
    }
    byName.set(p.name.trim().toLowerCase(), p);
  }

  const rowsPreview: CsvImportRowPreview[] = [];
  const discoveredNewPeople = new Set<string>();
  const matchedExistingPeople = new Set<string>();

  for (let i = 1; i < rawLines.length; i++) {
    const lineNum = i + 1;
    const fields = parseCsvLine(rawLines[i]);

    const name = (colIdx.name !== -1 ? fields[colIdx.name] : "")?.trim() || "";
    const rawPhone = (colIdx.phone !== -1 ? fields[colIdx.phone] : "")?.trim() || null;
    const rawType = (colIdx.type !== -1 ? fields[colIdx.type] : "")?.trim() || "";
    const rawAmount = (colIdx.amount !== -1 ? fields[colIdx.amount] : "")?.trim() || "";
    const rawNote = (colIdx.note !== -1 ? fields[colIdx.note] : "")?.trim() || null;
    const rawDueDate =
      (colIdx.dueDate !== -1 ? fields[colIdx.dueDate] : "")?.trim() || null;

    if (!name) {
      rowsPreview.push({
        line: lineNum,
        name: "(Empty)",
        phone: rawPhone,
        type: "GAVE",
        amount: "0.00",
        note: null,
        status: "ERROR",
        error: "Name is required.",
        isExistingPerson: false,
      });
      continue;
    }

    const type = normalizeEntryType(rawType);
    if (!type) {
      rowsPreview.push({
        line: lineNum,
        name,
        phone: rawPhone,
        type: "GAVE",
        amount: rawAmount,
        note: rawNote,
        status: "ERROR",
        error: `Invalid entry type "${rawType}". Expected Udhar/GAVE or Jama/RECEIVED.`,
        isExistingPerson: false,
      });
      continue;
    }

    // Validate amount
    let paise = 0;
    try {
      const trimmedAmt = rawAmount.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(trimmedAmt)) {
        throw new Error("Amount must be a positive decimal");
      }
      paise = decimalStringToPaise(trimmedAmt);
      if (paise <= 0) {
        throw new Error("Amount must be positive");
      }
    } catch {
      rowsPreview.push({
        line: lineNum,
        name,
        phone: rawPhone,
        type,
        amount: rawAmount,
        note: rawNote,
        status: "ERROR",
        error: `Invalid amount "${rawAmount}". Must be positive decimal (e.g. 150.00).`,
        isExistingPerson: false,
      });
      continue;
    }

    // Check existing contact match
    const normPhone = rawPhone ? normalizePhone(rawPhone) : null;
    const existing =
      (normPhone ? byPhone.get(normPhone) : undefined) ??
      byName.get(name.toLowerCase());

    const isExisting = Boolean(existing);
    if (isExisting && existing) {
      matchedExistingPeople.add(existing.id);
    } else {
      discoveredNewPeople.add(normPhone || name.toLowerCase());
    }

    // Format dueDate if provided
    let dueDateFormatted: string | null = null;
    if (rawDueDate) {
      const parsedDate = new Date(rawDueDate);
      if (!isNaN(parsedDate.getTime())) {
        dueDateFormatted = parsedDate.toISOString().split("T")[0];
      }
    }

    // Sanitize note for formula injection
    const note = rawNote ? sanitizeTextForCsv(rawNote) : null;

    rowsPreview.push({
      line: lineNum,
      name,
      phone: normPhone || rawPhone,
      type,
      amount: paiseToDecimalString(paise),
      note,
      dueDate: dueDateFormatted,
      status: "VALID",
      isExistingPerson: isExisting,
    });
  }

  const validCount = rowsPreview.filter((r) => r.status === "VALID").length;
  const errorCount = rowsPreview.filter((r) => r.status === "ERROR").length;

  return {
    totalRows: rowsPreview.length,
    validCount,
    errorCount,
    newPeopleCount: discoveredNewPeople.size,
    existingPeopleCount: matchedExistingPeople.size,
    rows: rowsPreview,
  };
}
