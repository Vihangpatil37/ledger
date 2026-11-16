"use client";

import { deleteEntry } from "@/actions/entries";
import { triggerUndoToast } from "@/components/trash/undo-toast";
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
    <form
      action={deleteEntry}
      onSubmit={() => {
        triggerUndoToast({
          id: entryId,
          kind: "ENTRY",
          title: "Entry",
          personId,
        });
      }}
    >
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
        className="inline-flex size-9 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-xl text-xs text-faint transition-colors hover:bg-danger-light hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger cursor-pointer"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </form>
  );
}
