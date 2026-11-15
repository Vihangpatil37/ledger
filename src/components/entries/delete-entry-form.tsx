"use client";

import { deleteEntry } from "@/actions/entries";
import { useLanguage } from "@/lib/i18n/client";

export function DeleteEntryForm({
  entryId,
  personId,
}: {
  entryId: string;
  personId: string;
}) {
  const { t } = useLanguage();

  return (
    <form action={deleteEntry}>
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="personId" value={personId} />
      <button
        type="submit"
        title={t("entry.deleteEntry")}
        aria-label={t("entry.deleteEntry")}
        onClick={(event) => {
          if (!confirm(t("entry.confirmDelete"))) {
            event.preventDefault();
          }
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-xs text-faint transition-colors hover:bg-danger-light hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger cursor-pointer"
      >
        ✕
      </button>
    </form>
  );
}
