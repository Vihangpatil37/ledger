import { Money } from "@/components/ui";
import type { StaffShiftSummary } from "@/lib/types";

export function StaffShiftCards({
  summary,
}: {
  summary: StaffShiftSummary;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink">
            <span className="size-1.5 rounded-full bg-credit animate-pulse" />
            Counter Shift Active · {summary.staffName}
          </span>
        </div>
        <p className="font-mono text-[11px] text-muted">Asia/Kolkata (Today)</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* Card 1: Today Collected (Jama) */}
        <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)]">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
            Today Collected (Jama)
          </p>
          <Money
            amount={summary.collectedToday}
            className="mt-2 block text-2xl sm:text-3xl font-bold tracking-tight text-credit"
          />
          <p className="mt-1 text-xs text-muted">Cash & payments received</p>
        </div>

        {/* Card 2: Today Given (Udhar) */}
        <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)]">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
            Today Given (Udhar)
          </p>
          <Money
            amount={summary.givenToday}
            className="mt-2 block text-2xl sm:text-3xl font-bold tracking-tight text-debit"
          />
          <p className="mt-1 text-xs text-muted">New credit extended</p>
        </div>

        {/* Card 3: Shift Transactions */}
        <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)]">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
            Shift Entries
          </p>
          <span className="mt-2 block font-mono text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            {summary.entriesCount}
          </span>
          <p className="mt-1 text-xs text-muted">Logged by you today</p>
        </div>
      </div>
    </div>
  );
}
