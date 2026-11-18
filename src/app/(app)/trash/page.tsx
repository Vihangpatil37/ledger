import Link from "next/link";
import { redirect } from "next/navigation";
import {
  emptyTrash,
  purgeTrashItem,
  restoreEntry,
  restorePerson,
} from "@/actions/trash";
import { formatWhen } from "@/lib/format";
import { getServerTranslations } from "@/lib/i18n/server";
import { getTrashItems } from "@/server/readers";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trash · Chai Ledger" };

export default async function TrashPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const [trashItems, { t }] = await Promise.all([
    getTrashItems(),
    getServerTranslations(),
  ]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-rule/50 pb-5">
        <div>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">←</span> {t("person.backToPeople")}
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("trash.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {t("trash.subtitle")}
          </p>
        </div>

        {trashItems.length > 0 && (
          <form action={emptyTrash}>
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-danger/30 bg-danger-light px-4 py-2 text-xs font-semibold text-danger hover:bg-danger-light/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger transition-colors cursor-pointer"
            >
              {t("trash.emptyBtn")}
            </button>
          </form>
        )}
      </div>

      {/* Items list */}
      {trashItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule bg-surface p-12 text-center text-muted text-sm">
          {t("trash.empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {trashItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-rule bg-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-rule bg-paper px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                    {item.kind}
                  </span>
                  <span className="font-bold text-sm text-ink">{item.title}</span>
                  {item.amount && (
                    <span className="font-mono text-sm font-semibold text-ink">
                      ₹{item.amount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted">
                  {item.subtitle && <span>{item.subtitle} · </span>}
                  <span>Deleted {formatWhen(item.deletedAt)}</span>
                  <span className="text-warning font-medium">
                    ({item.daysRemaining} {t("trash.daysLeft")})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <form
                  action={
                    item.kind === "PERSON"
                      ? restorePerson
                      : restoreEntry
                  }
                >
                  {item.kind === "PERSON" ? (
                    <input type="hidden" name="id" value={item.id} />
                  ) : (
                    <>
                      <input type="hidden" name="entryId" value={item.id} />
                      <input
                        type="hidden"
                        name="personId"
                        value={item.personId || ""}
                      />
                    </>
                  )}
                  <button
                    type="submit"
                    className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink transition-colors cursor-pointer"
                  >
                    {t("trash.restore")}
                  </button>
                </form>

                <form action={purgeTrashItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="kind" value={item.kind} />
                  <button
                    type="submit"
                    className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-rule px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 transition-colors cursor-pointer"
                  >
                    {t("trash.purge")}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
