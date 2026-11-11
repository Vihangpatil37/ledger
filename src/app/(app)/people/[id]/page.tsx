import Link from "next/link";
import { notFound } from "next/navigation";
import { AddEntryCard } from "@/components/entries/add-entry-card";
import { DeleteEntryForm } from "@/components/entries/delete-entry-form";
import { SettleBalanceModal } from "@/components/people/settle-balance-modal";
import { ShareStatementModal } from "@/components/people/share-statement-modal";
import { Money } from "@/components/ui";
import { getDueStatus } from "@/lib/due";
import { formatWhen } from "@/lib/format";
import { balanceMeta } from "@/lib/money";
import { idSchema } from "@/lib/validation";
import { normalizeWaPhone, reminderMessage, waLink } from "@/lib/whatsapp";
import { getPersonDetail } from "@/server/readers";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const detail = await getPersonDetail(id);
  if (!detail) notFound();

  const meta = balanceMeta(detail.balance);

  // One-click WhatsApp reminder: opens the chat with the reminder pre-filled
  const owesMoney = Number(detail.balance) > 0;
  const waNumber =
    owesMoney && detail.phone ? normalizeWaPhone(detail.phone) : null;
  const waHref = waNumber
    ? waLink(waNumber, reminderMessage(detail))
    : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header bar */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <span>←</span> Back to people
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {detail.name}
            </h1>
            {detail.phone ? (
              <a
                href={`tel:${detail.phone.replace(/\s+/g, "")}`}
                className="mt-0.5 inline-block font-mono text-xs sm:text-sm text-muted hover:text-ink hover:underline"
              >
                {detail.phone}
              </a>
            ) : null}
          </div>
          <Link
            href={`/people/${detail.id}/edit`}
            className="inline-flex min-h-[36px] items-center rounded-xl border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-[0_1px_2px_0_rgba(30,27,24,0.05)] transition-all duration-150 hover:bg-paper active:scale-[0.98]"
          >
            Edit profile
          </Link>
        </div>
      </div>

      {/* Balance overview card */}
      <div className="rounded-xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
          Current Balance · {meta.label}
        </p>
        <Money
          amount={detail.balance}
          abs
          className={`mt-2 block text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl ${meta.className}`}
        />
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule/50 pt-3.5 text-xs text-muted">
          <span>
            Total given:{" "}
            <Money amount={detail.gaveTotal} className="font-semibold text-ink" />
          </span>
          <span className="hidden sm:inline text-faint">·</span>
          <span>
            Total received:{" "}
            <Money amount={detail.receivedTotal} className="font-semibold text-ink" />
          </span>
        </div>
      </div>

      {/* Action Buttons: Settle Up + Share Statement + WhatsApp Reminder */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <SettleBalanceModal detail={detail} />
          <ShareStatementModal detail={detail} />

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
              Remind on WhatsApp
            </a>
          ) : null}
        </div>

        {owesMoney && !waNumber ? (
          <div className="rounded-lg border border-dashed border-rule bg-surface px-4 py-2.5 text-center text-xs text-muted">
            Add a phone number to enable WhatsApp reminders ·{" "}
            <Link
              href={`/people/${detail.id}/edit`}
              className="font-medium text-focus hover:underline"
            >
              add number
            </Link>
          </div>
        ) : null}
      </div>

      {/* Record new transaction */}
      <AddEntryCard personId={detail.id} />

      {/* Entry History */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink tracking-tight">
            Activity History
          </h2>
          <span className="font-mono text-xs text-muted">
            {detail.entries.length} {detail.entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {detail.entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-rule bg-surface px-4 py-8 sm:px-6 sm:py-8 text-center text-xs sm:text-sm text-muted">
            No entries recorded yet · use the form above to record your first transaction.
          </div>
        ) : (
          <ul className="divide-y divide-rule/60 overflow-hidden rounded-lg border border-rule bg-surface">
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
                        {isGave ? "Udhar " : "You received "}
                        <Money amount={entry.amount} />
                      </p>
                      {dueInfo ? (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold tracking-wide ${dueInfo.className}`}
                        >
                          {dueInfo.label}
                        </span>
                      ) : null}
                    </div>

                    {entry.note ? (
                      <p className="mt-1 text-xs text-ink/85 break-words line-clamp-2">
                        {entry.note}
                      </p>
                    ) : null}

                    <p className="mt-1 text-[11px] sm:text-xs text-muted">
                      {formatWhen(entry.createdAt)} · balance{" "}
                      <Money
                        amount={entry.running}
                        className={`font-medium ${runningMeta.className}`}
                      />
                    </p>
                  </div>
                  <DeleteEntryForm entryId={entry.id} personId={detail.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

