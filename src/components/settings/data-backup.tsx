"use client";

import { useState } from "react";
import {
  commitCsvImport,
  exportBackupJson,
  previewCsvImport,
  restoreBackupJson,
} from "@/actions/backup";
import { useLanguage } from "@/lib/i18n/client";
import type { CsvImportPreview } from "@/lib/types";

export function DataBackupSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // CSV Import State
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvImportPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const { t } = useLanguage();

  async function handleExportJson() {
    setIsExporting(true);
    try {
      const res = await exportBackupJson();
      if (!res.ok || !res.data) {
        alert(res.error || "Failed to export backup");
        return;
      }
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `chai-ledger-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleJsonFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Are you sure you want to restore data from this backup? Existing contacts will be matched.")) {
      e.target.value = "";
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);
    try {
      const text = await file.text();
      const res = await restoreBackupJson(text);
      if (res.ok && res.count) {
        setRestoreMessage(`Successfully restored ${res.count.people} contacts and ${res.count.entries} entries!`);
      } else {
        alert(res.error || "Failed to restore backup.");
      }
    } catch {
      alert("Failed to read file.");
    } finally {
      setIsRestoring(false);
      e.target.value = "";
    }
  }

  async function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCsvContent(text);
      const res = await previewCsvImport(text);
      if (res.ok && res.preview) {
        setCsvPreview(res.preview);
        setIsPreviewOpen(true);
      } else {
        alert(res.error || "Could not parse CSV.");
      }
    } catch {
      alert("Failed to read CSV file.");
    } finally {
      e.target.value = "";
    }
  }

  async function handleCommitImport() {
    if (!csvContent) return;
    setIsImporting(true);
    try {
      const res = await commitCsvImport(csvContent);
      if (res.ok && res.importedCount !== undefined) {
        setImportMessage(`Imported ${res.importedCount} transactions successfully!`);
        setIsPreviewOpen(false);
      } else {
        alert(res.error || "Failed to import CSV.");
      }
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="rounded-xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)] space-y-5">
      <div>
        <h2 className="text-sm font-bold text-ink tracking-tight">
          {t("backup.title")}
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Safeguard your khata with portable JSON backups or import existing customer ledgers from CSV.
        </p>
      </div>

      {restoreMessage && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-800 font-medium">
          {restoreMessage}
        </div>
      )}

      {importMessage && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-800 font-medium">
          {importMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card 1: Full JSON Backup */}
        <div className="rounded-xl border border-rule bg-paper p-4 space-y-3">
          <div>
            <h3 className="font-bold text-xs text-ink">Full JSON Backup</h3>
            <p className="text-[11px] text-muted mt-0.5">
              Export all people, entries, promises, and settings into a single file.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={isExporting}
            className="w-full inline-flex items-center justify-center rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper hover:bg-ink/90 transition-colors cursor-pointer"
          >
            {isExporting ? "Generating…" : t("backup.exportBtn")}
          </button>
        </div>

        {/* Card 2: Restore JSON Backup */}
        <div className="rounded-xl border border-rule bg-paper p-4 space-y-3">
          <div>
            <h3 className="font-bold text-xs text-ink">{t("backup.restoreTitle")}</h3>
            <p className="text-[11px] text-muted mt-0.5">
              Restore from a previously downloaded .json backup file.
            </p>
          </div>
          <label className="w-full inline-flex items-center justify-center rounded-lg border border-rule bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors cursor-pointer">
            <span>{isRestoring ? "Restoring…" : t("backup.restoreBtn")}</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleJsonFileChange}
              disabled={isRestoring}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Card 3: CSV Import from Paper Khata / Excel */}
      <div className="rounded-xl border border-rule bg-paper p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-bold text-xs text-ink">{t("backup.csvTitle")}</h3>
            <p className="text-[11px] text-muted mt-0.5">
              Import ledger entries from CSV (Name, Phone, Type, Amount, Note, DueDate).
            </p>
          </div>
          <label className="inline-flex items-center justify-center rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-paper hover:bg-ink/90 transition-colors cursor-pointer self-start sm:self-auto shrink-0">
            <span>{t("backup.csvBtn")}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* CSV Dry-Run Preview Modal */}
      {/* preview modal deferred to next commit */ false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-rule bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-rule/50 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">
                  {t("backup.csvPreview")}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Review matched contacts and entries before importing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-muted hover:text-ink text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg border border-rule bg-paper p-2.5">
                <span className="text-muted block text-[10px] uppercase font-mono">Total Rows</span>
                <span className="font-mono font-bold text-ink text-sm">{csvPreview.totalRows}</span>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                <span className="text-emerald-800 block text-[10px] uppercase font-mono">Valid Entries</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">{csvPreview.validCount}</span>
              </div>
              <div className="rounded-lg border border-rule bg-paper p-2.5">
                <span className="text-muted block text-[10px] uppercase font-mono">Existing Contacts</span>
                <span className="font-mono font-bold text-ink text-sm">{csvPreview.existingPeopleCount}</span>
              </div>
              <div className="rounded-lg border border-rule bg-paper p-2.5">
                <span className="text-muted block text-[10px] uppercase font-mono">New Contacts</span>
                <span className="font-mono font-bold text-focus text-sm">{csvPreview.newPeopleCount}</span>
              </div>
            </div>

            {/* Preview Rows Table */}
            <div className="flex-1 overflow-y-auto border border-rule rounded-xl max-h-64">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-paper text-muted sticky top-0 border-b border-rule font-mono text-[11px]">
                  <tr>
                    <th className="p-2.5">Line</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Amount</th>
                    <th className="p-2.5">Match</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40 font-mono text-[11px]">
                  {csvPreview.rows.slice(0, 50).map((r) => (
                    <tr key={r.line} className={r.status === "ERROR" ? "bg-rose-50" : ""}>
                      <td className="p-2 text-muted">{r.line}</td>
                      <td className="p-2 font-sans font-semibold text-ink">{r.name}</td>
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            r.type === "GAVE"
                              ? "bg-debit-light text-debit"
                              : "bg-credit-light text-credit"
                          }`}
                        >
                          {r.type === "GAVE" ? "Udhar" : "Jama"}
                        </span>
                      </td>
                      <td className="p-2 font-bold">₹{r.amount}</td>
                      <td className="p-2 text-muted">
                        {r.isExistingPerson ? "Existing" : "+ New"}
                      </td>
                      <td className="p-2">
                        {r.status === "VALID" ? (
                          <span className="text-emerald-700 font-bold">✓ Valid</span>
                        ) : (
                          <span className="text-rose-600 font-bold" title={r.error}>
                            ✕ Error
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {csvPreview.rows.length > 50 && (
              <p className="text-[11px] text-muted text-center">
                Showing first 50 rows of {csvPreview.rows.length}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule/50">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-xl border border-rule px-4 py-2 text-xs font-semibold text-muted hover:bg-paper"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={isImporting || csvPreview.validCount === 0}
                className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink/90 disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? "Importing…" : `${t("backup.csvCommit")} (${csvPreview.validCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
