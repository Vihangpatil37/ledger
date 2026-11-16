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
    <div className="flex flex-col gap-6">
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
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs sm:text-sm font-semibold text-paper shadow-[0_2px_4px_0_rgba(30,27,24,0.15)] transition-all duration-150 hover:bg-ink/90 active:scale-[0.98] self-start sm:self-auto cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>{t("nav.addPerson")}</span>
          </Link>
        )}
      </div>

      {/* Metrics Bar: Staff Shift Summary OR Integrated Cashbook Banner */}
      {shiftSummary ? (
        <StaffShiftCards summary={shiftSummary} />
      ) : (
        <div className="rounded-2xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_12px_0_rgba(30,27,24,0.04)] transition-all">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-rule/60 pb-4">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
                <span>{t("home.netBalance")}</span>
                <span
                  className={`inline-block size-2 rounded-full ${
                    isNetPositive
                      ? "bg-debit"
                      : isNetNegative
                        ? "bg-credit"
                        : "bg-ink/40"
                  }`}
                  aria-hidden="true"
                />
              </p>
              <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                <Money
                  amount={summary.netBalance}
                  abs
                  className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                    isNetPositive
                      ? "text-debit"
                      : isNetNegative
                        ? "text-credit"
                        : "text-ink"
                  }`}
                />
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isNetPositive
                      ? "bg-debit-light text-debit border border-debit/20"
                      : isNetNegative
                        ? "bg-credit-light text-credit border border-credit/20"
                        : "bg-paper text-muted border border-rule"
                  }`}
                >
                  {isNetPositive
                    ? t("home.youllGet")
                    : isNetNegative
                      ? t("home.youllGive")
                      : t("home.settledBadge")}
                </span>
              </div>
            </div>

            {summary.overdueCount > 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-debit-light border border-debit/30 px-3.5 py-2 text-xs text-debit font-medium self-start sm:self-auto">
                <span className="font-bold text-sm">⚠</span>
                <span>
                  <strong>{summary.overdueCount}</strong> {t("home.summaryOverdue").toLowerCase()}
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 sm:divide-x sm:divide-rule/60">
            {/* Left stream: Udhar (You will get) */}
            <div className="pr-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {t("home.youllGet")}
                </span>
                <span className="size-2 rounded-full bg-debit ring-4 ring-debit/10" aria-hidden="true" />
              </div>
              <Money
                amount={summary.youllGet}
                className="mt-1.5 block text-xl sm:text-2xl font-bold text-debit tracking-tight"
              />
              <p className="mt-1 text-xs text-muted">
                {summary.debtorsCount} {t("home.filterDebtors")}
              </p>
            </div>

            {/* Right stream: Advance Deposit (Jama) */}
            <div className="sm:pl-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {t("home.youllGive")}
                </span>
                <span className="size-2 rounded-full bg-credit ring-4 ring-credit/10" aria-hidden="true" />
              </div>
              <Money
                amount={summary.youllGive}
                abs
                className="mt-1.5 block text-xl sm:text-2xl font-bold text-credit tracking-tight"
              />
              <p className="mt-1 text-xs text-muted">
                {summary.creditorsCount} {t("home.filterCreditors")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Follow-up Queue Banner */}
      {!isStaff && followUpQueue.length > 0 && <FollowUpQueue items={followUpQueue} />}

      {/* Main Dashboard Grid: People Directory (Left) + Activity & Stats (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start pt-2">
        {/* Left Column: People Directory */}
        <section className="lg:col-span-8 flex flex-col gap-3">
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
        <section className="lg:col-span-4 flex flex-col gap-4">
          <RecentActivity entries={summary.recentEntries} />

          {/* Quick Ledger Overview Card */}
          <div className="rounded-xl border border-rule bg-surface p-4 sm:p-5 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)] flex flex-col gap-3">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t("home.summaryTitle")}
            </h3>
            <div className="flex flex-col gap-2 text-xs">
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
