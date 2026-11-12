"use client";

import { useEffect, useState } from "react";
import { formatStatementMessage, normalizeWaPhone, universalWaLink } from "@/lib/whatsapp";
import type { PersonDetail } from "@/lib/types";

export function ShareStatementModal({ detail }: { detail: PersonDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [limit, setLimit] = useState<number>(5);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const statementText = formatStatementMessage(detail, limit);
  const waNumber = detail.phone ? normalizeWaPhone(detail.phone) : null;
  const waUrl = universalWaLink(statementText, waNumber);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(statementText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement("textarea");
      textarea.value = statementText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ledger statement - ${detail.name}`,
          text: statementText,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-rule bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-2xs transition-colors hover:bg-paper active:bg-rule/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 text-muted"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share statement
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-t-2xl border-t border-rule bg-surface p-5 shadow-2xl sm:rounded-2xl sm:border max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-rule/60 pb-3.5">
              <div>
                <h3 id="share-modal-title" className="font-display text-lg font-bold tracking-tight text-ink">
                  Share Ledger Statement
                </h3>
                <p className="font-mono text-xs text-muted">
                  For {detail.name} · {detail.entries.length} total entries
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scope selection */}
            <div className="my-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">Include:</span>
              <div className="inline-flex rounded-lg border border-rule bg-paper p-0.5">
                {[
                  { label: "Recent 5", value: 5 },
                  { label: "Recent 10", value: 10 },
                  { label: "All history", value: 0 },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLimit(option.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      limit === option.value
                        ? "bg-surface text-ink shadow-[0_1px_2px_0_rgba(30,27,24,0.08)] font-semibold"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Box */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-rule/80 bg-paper/60 p-3.5 text-xs leading-relaxed font-mono whitespace-pre-wrap text-ink select-all shadow-inner">
              {statementText}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#25d366] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#20ba5a] active:bg-[#1ea952]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className="size-4"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Share on WhatsApp
              </a>

              {canNativeShare ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-rule bg-surface px-3.5 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-paper"
                >
                  <span>Share via apps…</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  copied
                    ? "border-credit bg-credit text-white"
                    : "border-rule bg-surface text-ink hover:bg-paper"
                } ${!canNativeShare ? "sm:col-span-1" : ""}`}
              >
                {copied ? "Copied to clipboard ✓" : "Copy statement"}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-rule bg-surface px-3.5 py-2.5 text-xs font-semibold text-muted transition-colors hover:bg-paper hover:text-ink sm:col-span-2"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print / Save PDF statement
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
