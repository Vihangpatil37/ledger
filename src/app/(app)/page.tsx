import Link from "next/link";
import { FollowUpQueue } from "@/components/home/follow-up-queue";
import { PeopleList } from "@/components/home/people-list";
import { RecentActivity } from "@/components/home/recent-activity";
import { StaffShiftCards } from "@/components/home/staff-shift-cards";
import { Money } from "@/components/ui";
import {
  getFollowUpQueue,
  getHomeSummary,
  getStaffShiftSummary,
} from "@/server/readers";
import { getSession } from "@/server/session";
import { getServerTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const isStaff = session?.role === "STAFF";

  const [summary, followUpQueue, { t }, shiftSummary] = await Promise.all([
    getHomeSummary(),
    isStaff ? Promise.resolve([]) : getFollowUpQueue(),
    getServerTranslations(),
    isStaff && session?.staffId
      ? getStaffShiftSummary(session.userId, session.staffId)
      : Promise.resolve(null),
  ]);

  const count = summary.rows.length;
  const netValue = Number(summary.netBalance);
  const isNetPositive = netValue > 0;
  const isNetNegative = netValue < 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-rule/50 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t("nav.dashboard")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {isStaff
              ? `Counter Shift Mode · ${session.staffName}`
              : count === 0
                ? t("home.addFirstPerson")
                : `${summary.debtorsCount} ${t("home.filterDebtors")} · ${summary.creditorsCount} ${t("home.filterCreditors")} · ${summary.settledCount} ${t("home.filterSettled")}`}
          </p>
        </div>

        {!isStaff && (
          <Link
            href="/people/new"
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs sm:text-sm font-semibold text-paper shadow-[0_2px_4px_0_rgba(30,27,24,0.15)] transition-all duration-150 hover:bg-ink/90 active:scale-[0.98] self-start sm:self-auto cursor-pointer"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>{t("nav.addPerson")}</span>
          </Link>
        )}
      </div>

      {/* Metrics Bar: Staff Shift Summary OR Owner Financial Health */}
      {shiftSummary ? (
        <StaffShiftCards summary={shiftSummary} />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* Card 1: Net Balance */}
        <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)] transition-all">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
            {t("home.netBalance")}
          </p>
          <Money
            amount={summary.netBalance}
            abs
            className={`mt-2 block text-2xl sm:text-3xl font-bold tracking-tight ${
              isNetPositive
                ? "text-debit"
                : isNetNegative
                  ? "text-credit"
                  : "text-ink"
            }`}
          />
          <p className="mt-1.5 text-xs text-muted">
            {isNetPositive
              ? t("home.youllGet")
              : isNetNegative
                ? t("home.youllGive")
                : t("home.settledBadge")}
          </p>
        </div>

        {/* Card 2: Udhar (You will get) */}
        <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)] transition-all">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t("home.youllGet")}
            </p>
            <span className="size-2 rounded-full bg-debit ring-4 ring-debit/10" />
          </div>
          <Money
            amount={summary.youllGet}
            className="mt-2 block text-2xl sm:text-3xl font-bold text-debit tracking-tight"
          />
          <p className="mt-1.5 text-xs text-muted">
            {summary.debtorsCount} {t("home.filterDebtors")}
          </p>
        </div>

        {/* Card 3: Advance Deposit (Jama) */}
        <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)] transition-all">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t("home.youllGive")}
            </p>
            <span className="size-2 rounded-full bg-credit ring-4 ring-credit/10" />
          </div>
          <Money
            amount={summary.youllGive}
            abs
            className="mt-2 block text-2xl sm:text-3xl font-bold text-credit tracking-tight"
          />
          <p className="mt-1.5 text-xs text-muted">
            {summary.creditorsCount} {t("home.filterCreditors")}
          </p>
        </div>
      </div>
      )}

      {/* Today's Follow-up Queue Banner */}
      {!isStaff && followUpQueue.length > 0 && <FollowUpQueue items={followUpQueue} />}

      {/* Main Dashboard Grid: People Directory (Left) + Activity & Stats (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start pt-2">
        {/* Left Column: People Directory */}
        <section className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink tracking-tight">
              {t("home.directoryTitle")}
            </h2>
            <span className="font-mono text-xs text-muted">
              {summary.rows.length} {summary.rows.length === 1 ? "contact" : "contacts"}
            </span>
          </div>

          <PeopleList
            rows={summary.rows}
            counts={{
              owesYou: summary.debtorsCount,
              youOwe: summary.creditorsCount,
              overdue: summary.overdueCount,
              settled: summary.settledCount,
            }}
          />
        </section>

        {/* Right Column: Recent Activity & Quick Stats */}
        <section className="lg:col-span-4 space-y-4">
          <RecentActivity entries={summary.recentEntries} />

          {/* Quick Ledger Overview Card */}
          <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)] space-y-3">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t("home.summaryTitle")}
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-rule/40">
                <span className="text-muted">{t("home.summaryTotal")}</span>
                <span className="font-mono font-semibold text-ink">{count}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rule/40">
                <span className="text-muted">{t("home.summaryDebtors")}</span>
                <span className="font-mono font-semibold text-debit">{summary.debtorsCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rule/40">
                <span className="text-muted">{t("home.summaryOverdue")}</span>
                <span className={`font-mono font-semibold ${summary.overdueCount > 0 ? "text-debit font-bold" : "text-muted"}`}>
                  {summary.overdueCount}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-rule/40">
                <span className="text-muted">{t("home.summaryCreditors")}</span>
                <span className="font-mono font-semibold text-credit">{summary.creditorsCount}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">{t("home.summarySettled")}</span>
                <span className="font-mono font-semibold text-muted">{summary.settledCount}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
