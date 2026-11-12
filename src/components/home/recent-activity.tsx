import Link from "next/link";
import { Money } from "@/components/ui";
import { getDueStatus } from "@/lib/due";
import { formatWhen } from "@/lib/format";
import type { RecentEntryItem } from "@/lib/types";

export function RecentActivity({ entries }: { entries: RecentEntryItem[] }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)]">
      <div className="flex items-center justify-between pb-3 border-b border-rule/50">
        <h2 className="font-display text-base font-bold text-ink tracking-tight">Recent Activity</h2>
        <span className="font-mono text-xs text-muted">
          {entries.length} recent
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs font-medium text-muted">
            No transactions yet.
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-faint">
            Transactions you record will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-rule/50">
          {entries.map((entry) => {
            const isGave = entry.type === "GAVE";
            return (
              <li
                key={entry.id}
                className="py-3 flex items-start justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/people/${entry.personId}`}
                      className="font-semibold text-ink hover:text-focus transition-colors truncate max-w-[140px]"
                    >
                      {entry.personName}
                    </Link>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase ${
                        isGave
                          ? "bg-debit-light text-debit border border-debit/20"
                          : "bg-credit-light text-credit border border-credit/20"
                      }`}
                    >
                      {isGave ? "Udhar" : "Received"}
                    </span>
                    {entry.dueDate ? (
                      (() => {
                        const dueInfo = getDueStatus(entry.dueDate);
                        return dueInfo ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold tracking-wide ${dueInfo.className}`}
                          >
                            {dueInfo.label}
                          </span>
                        ) : null;
                      })()
                    ) : null}
                  </div>

                  {entry.note ? (
                    <p className="mt-0.5 text-[11px] text-muted truncate">
                      {entry.note}
                    </p>
                  ) : null}

                  <p className="mt-1 font-mono text-[10px] text-muted">
                    {formatWhen(entry.createdAt)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <Money
                    amount={entry.amount}
                    className={`font-bold text-xs ${
                      isGave ? "text-debit" : "text-credit"
                    }`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
