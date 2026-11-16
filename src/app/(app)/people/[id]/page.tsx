import Link from "next/link";
import { notFound } from "next/navigation";
import { AddEntryCard } from "@/components/entries/add-entry-card";
import { DeleteEntryForm } from "@/components/entries/delete-entry-form";
import { EditEntryModal } from "@/components/entries/edit-entry-modal";
import { PromiseModal } from "@/components/people/promise-modal";
import { ReliabilityBadge } from "@/components/people/reliability-badge";
import { SettleBalanceModal } from "@/components/people/settle-balance-modal";
import { ShareStatementModal } from "@/components/people/share-statement-modal";
import { Money } from "@/components/ui";
import { formatDueLabel, getDueStatus } from "@/lib/due";
import { formatWhen } from "@/lib/format";
import { balanceMeta } from "@/lib/money";
import { getPresetDateRange } from "@/lib/range";
import { dateRangeSchema, idSchema } from "@/lib/validation";
import { normalizeWaPhone, reminderMessage, universalWaLink } from "@/lib/whatsapp";
import { getPersonDetail } from "@/server/readers";
import { getSession } from "@/server/session";
import { getServerTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const rawParams = await searchParams;
  const parsedRange = dateRangeSchema.safeParse(rawParams);
  const range = parsedRange.success ? parsedRange.data : undefined;

  const [detail, session, { t }] = await Promise.all([
    getPersonDetail(id, range),
    getSession(),
    getServerTranslations(),
  ]);
  if (!detail) notFound();

  const isStaff = session?.role === "STAFF";

  const meta = balanceMeta(detail.balance);

  const thisMonth = getPresetDateRange("THIS_MONTH");
  const last30 = getPresetDateRange("LAST_30_DAYS");

  const isAll = !range?.from && !range?.to;
  const isThisMonth = range?.from === thisMonth.from && range?.to === thisMonth.to;
  const isLast30 = range?.from === last30.from && range?.to === last30.to;

  // One-click WhatsApp reminder: opens the chat with the reminder pre-filled
  const owesMoney = Number(detail.balance) > 0;
  const waNumber =
    owesMoney && detail.phone ? normalizeWaPhone(detail.phone) : null;
  const waHref = waNumber
    ? universalWaLink(reminderMessage(detail), waNumber)
    : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header bar */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <span>←</span> {t("person.backToPeople")}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {detail.name}
              </h1>
              <ReliabilityBadge score={detail.reliability} />
            </div>
            {detail.phone ? (
              <a
                href={`tel:${detail.phone.replace(/\s+/g, "")}`}
                className="mt-0.5 inline-block font-mono text-xs sm:text-sm text-muted hover:text-ink hover:underline"
              >
                {detail.phone}
              </a>
            ) : null}
          </div>
          {!isStaff && (
            <Link
              href={`/people/${detail.id}/edit`}
              className="inline-flex min-h-[36px] items-center rounded-xl border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-[0_1px_2px_0_rgba(30,27,24,0.05)] transition-all duration-150 hover:bg-paper active:scale-[0.98]"
            >
              {t("person.editPerson")}
            </Link>
          )}
        </div>
      </div>

      {/* Balance overview card */}
      <div className="rounded-xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t("person.runningBalance")}
        </p>
        <Money
          amount={detail.balance}
          abs
          className={`mt-2 block text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl ${meta.className}`}
        />
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule/50 pt-3.5 text-xs text-muted">
          <span>
            {t("entry.gave")}:{" "}
            <Money amount={detail.gaveTotal} className="font-semibold text-ink" />
          </span>
          <span className="hidden sm:inline text-faint">·</span>
          <span>
            {t("entry.received")}:{" "}
            <Money amount={detail.receivedTotal} className="font-semibold text-ink" />
          </span>
        </div>
      </div>

      {/* Promise & Reminder Context Banner */}
      {!isStaff && (detail.promiseDate || detail.lastRemindedAt) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rule bg-surface p-3.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            {detail.promiseDate ? (
              <span className="font-medium text-ink">
                📅 {t("promise.title")}: <strong className="font-mono text-ink">{detail.promiseDate}</strong>
                {detail.promiseNote ? <span className="text-muted italic"> &ldquo;{detail.promiseNote}&rdquo;</span> : ""}
              </span>
            ) : null}
          </div>
          {detail.lastRemindedAt ? (
            <span className="text-muted">
              {t("queue.remindedAgo")}: <strong className="text-ink">{formatWhen(detail.lastRemindedAt)}</strong>
            </span>
          ) : null}
        </div>
      )}

      {/* Action Buttons: Settle Up + Share Statement + WhatsApp Reminder + Set Promise */}
      {!isStaff && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SettleBalanceModal detail={detail} />
            <ShareStatementModal detail={detail} />

            <PromiseModal
              personId={detail.id}
              currentPromiseDate={detail.promiseDate}
              currentPromiseNote={detail.promiseNote}
              triggerLabel={t("promise.title")}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rule bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-2xs transition-colors hover:bg-paper active:scale-[0.98]"
            />

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 py-2.5 text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-[#20ba5a] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25d366]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className="size-4"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t("person.remindWhatsApp")}
              </a>
            ) : null}
          </div>

          {owesMoney && !waNumber ? (
            <div className="rounded-lg border border-dashed border-rule bg-surface px-4 py-2.5 text-center text-xs text-muted">
              {t("person.addPhoneNotice")} ·{" "}
              <Link
                href={`/people/${detail.id}/edit`}
                className="font-medium text-focus hover:underline"
              >
                {t("person.addNumberLink")}
              </Link>
            </div>
          ) : null}
        </div>
      )}

      {/* Record new transaction */}
      <AddEntryCard personId={detail.id} />

      {/* Entry History */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-ink tracking-tight">
              {t("person.activityHistory")}
            </h2>
            <span className="font-mono text-xs text-muted">
              {detail.entries.length} {detail.entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {/* Date range filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Link
              href={`/people/${detail.id}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                isAll
                  ? "bg-ink text-paper shadow-2xs"
                  : "border border-rule bg-surface text-muted hover:bg-paper hover:text-ink"
              }`}
            >
              {t("person.rangeAll")}
            </Link>
            <Link
              href={`/people/${detail.id}?from=${thisMonth.from}&to=${thisMonth.to}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                isThisMonth
                  ? "bg-ink text-paper shadow-2xs"
                  : "border border-rule bg-surface text-muted hover:bg-paper hover:text-ink"
              }`}
            >
              {t("person.rangeThisMonth")}
            </Link>
            <Link
              href={`/people/${detail.id}?from=${last30.from}&to=${last30.to}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                isLast30
                  ? "bg-ink text-paper shadow-2xs"
                  : "border border-rule bg-surface text-muted hover:bg-paper hover:text-ink"
              }`}
            >
              {t("person.rangeLast30Days")}
            </Link>
          </div>
        </div>

        {detail.entries.length === 0 && !detail.openingBalance ? (
          <div className="rounded-lg border border-dashed border-rule bg-surface px-4 py-8 sm:px-6 sm:py-8 text-center text-xs sm:text-sm text-muted">
            {t("person.noEntriesInRange")}
          </div>
        ) : (
          <ul className="divide-y divide-rule/60 overflow-hidden rounded-lg border border-rule bg-surface">
            {detail.openingBalance !== null && detail.openingBalance !== undefined ? (
              <li className="flex items-center justify-between gap-2.5 bg-paper/70 px-3.5 py-2.5 text-xs sm:px-4 border-b border-rule/70">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                    {t("person.openingBalance")}
                  </span>
                  <span className="font-mono text-[10px] text-faint ml-1.5">
                    {t("person.priorTo")} {range?.from}
                  </span>
                </div>
                <div className="text-right">
                  <Money
                    amount={detail.openingBalance}
                    className="font-bold text-xs text-ink"
                  />
                </div>
              </li>
            ) : null}

            {detail.entries.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-muted">
                {t("person.noEntriesInRange")}
              </li>
            ) : null}

            {detail.entries.map((entry) => {
              const runningMeta = balanceMeta(entry.running);
              const isGave = entry.type === "GAVE";
              const dueInfo = entry.dueDate ? getDueStatus(entry.dueDate) : null;
              return (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-2.5 px-3.5 py-3 transition-colors hover:bg-paper/50 sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span
                        className={`inline-block size-2 rounded-full shrink-0 ${
                          isGave ? "bg-debit" : "bg-credit"
                        }`}
                      />
                      <p
                        className={`text-sm font-semibold truncate ${
                          isGave ? "text-debit" : "text-credit"
                        }`}
                      >
                        {isGave ? `${t("entry.gave")} ` : `${t("entry.received")} `}
                        <Money amount={entry.amount} />
                      </p>
                      {dueInfo ? (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold tracking-wide ${dueInfo.className}`}
                        >
                          {formatDueLabel(dueInfo, t)}
                        </span>
                      ) : null}
                    </div>

                    {entry.note ? (
                      <p className="mt-1 text-xs text-ink/85 break-words line-clamp-2">
                        {entry.note}
                      </p>
                    ) : null}

                    <p className="mt-1 text-[11px] sm:text-xs text-muted flex items-center gap-1 flex-wrap">
                      <span>{formatWhen(entry.createdAt)}</span>
                      {entry.createdBy?.role === "STAFF" && entry.createdBy.staffName ? (
                        <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-medium text-muted border border-rule/50">
                          Added by {entry.createdBy.staffName}
                        </span>
                      ) : null}
                      {entry.editedAt ? (
                        <span className="font-mono text-[10px] text-muted italic">
                          {t("person.edited")}
                        </span>
                      ) : null}
                      <span>·</span>
                      <span>{t("person.runningBalance")}</span>
                      <Money
                        amount={entry.running}
                        className={`font-medium ${runningMeta.className}`}
                      />
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {entry.canEdit !== false ? <EditEntryModal entry={entry} /> : null}
                    {!isStaff && <DeleteEntryForm entryId={entry.id} personId={detail.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
