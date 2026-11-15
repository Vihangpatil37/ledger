"use client";

import { useState } from "react";
import Link from "next/link";
import { recordReminder } from "@/actions/reminders";
import { PromiseModal } from "@/components/people/promise-modal";
import { ReliabilityBadge } from "@/components/people/reliability-badge";
import { Money } from "@/components/ui";
import { formatWhen } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/client";
import type { FollowUpItem } from "@/lib/types";

export function FollowUpQueue({ items }: { items: FollowUpItem[] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [remindedMap, setRemindedMap] = useState<Record<string, string>>({});
  const { t } = useLanguage();

  if (items.length === 0) return null;

  async function handleWhatsAppClick(item: FollowUpItem) {
    // Record reminder timestamp in background
    setRemindedMap((prev) => ({ ...prev, [item.personId]: "Just now" }));
    try {
      await recordReminder(item.personId);
    } catch {
      // optimistic state is fine for local UX
    }
  }

  return (
    <div className="rounded-2xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_12px_0_rgba(30,27,24,0.04)] space-y-3.5 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-debit text-paper text-xs font-bold">
            {items.length}
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-ink tracking-tight flex items-center gap-2">
              <span>{t("queue.title")}</span>
            </h2>
            <p className="text-xs text-muted">{t("queue.subtitle")}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs font-semibold text-muted hover:text-ink px-2.5 py-1 rounded-lg border border-rule/60 hover:bg-paper transition-colors"
        >
          {isCollapsed ? `Show (${items.length})` : "Collapse"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
          {items.map((item) => {
            const remindedText =
              remindedMap[item.personId] ||
              (item.lastRemindedAt
                ? formatWhen(item.lastRemindedAt)
                : null);

            let urgencyStyle = "bg-paper text-muted border-rule";
            if (item.urgency === "BROKEN_PROMISE") {
              urgencyStyle =
                "bg-rose-500/10 text-rose-800 border-rose-500/30 font-bold";
            } else if (item.urgency === "OVERDUE") {
              urgencyStyle =
                "bg-debit-light text-debit border-debit/30 font-bold";
            } else if (item.urgency === "DUE_TODAY") {
              urgencyStyle =
                "bg-amber-500/10 text-amber-800 border-amber-500/30 font-semibold";
            } else {
              urgencyStyle =
                "bg-focus-light text-focus border-focus/30 font-semibold";
            }

            return (
              <div
                key={item.personId}
                className="rounded-xl border border-rule bg-paper p-3.5 flex flex-col justify-between gap-3 transition-shadow hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${urgencyStyle}`}
                    >
                      {item.urgencyLabel}
                    </span>
                    <ReliabilityBadge score={item.reliability} compact />
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <Link
                      href={`/people/${item.personId}`}
                      className="truncate font-bold text-sm text-ink hover:underline"
                    >
                      {item.name}
                    </Link>
                    <Money
                      amount={item.balance}
                      className="font-mono text-sm font-bold text-debit"
                    />
                  </div>

                  {item.promiseNote && (
                    <p className="text-[11px] text-muted italic mt-1 line-clamp-1">
                      &ldquo;{item.promiseNote}&rdquo;
                    </p>
                  )}

                  <p className="text-[11px] text-muted mt-1">
                    {remindedText ? (
                      <span>
                        {t("queue.remindedAgo")}:{" "}
                        <strong className="text-ink">{remindedText}</strong>
                      </span>
                    ) : (
                      <span className="text-muted/70">No reminders sent yet</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-rule/50">
                  {item.waHref ? (
                    <a
                      href={item.waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleWhatsAppClick(item)}
                      className="flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#20ba5a] active:scale-[0.98] transition-all"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        className="size-3.5"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>Nudge</span>
                    </a>
                  ) : (
                    <Link
                      href={`/people/${item.personId}/edit`}
                      className="flex-1 inline-flex min-h-[34px] items-center justify-center rounded-lg border border-rule bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink"
                    >
                      + Phone
                    </Link>
                  )}

                  <PromiseModal
                    personId={item.personId}
                    currentPromiseDate={item.promiseDate}
                    currentPromiseNote={item.promiseNote}
                    triggerLabel="Wada"
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-rule bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
