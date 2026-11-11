"use client";

import { deleteEntry } from "@/actions/entries";

export function DeleteEntryForm({
  entryId,
  personId,
}: {
  entryId: string;
  personId: string;
}) {
  return (
    <form action={deleteEntry}>
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="personId" value={personId} />
      <button
        type="submit"
        title="Delete entry"
        aria-label="Delete entry"
        onClick={(event) => {
          if (!confirm("Delete this entry? The balance will be recalculated.")) {
            event.preventDefault();
          }
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-xs text-faint transition-colors hover:bg-danger-light hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
      >
        ✕
      </button>
    </form>
  );
}
