"use client";

import { deletePerson } from "@/actions/people";

export function DeletePersonForm({ personId }: { personId: string }) {
  return (
    <form action={deletePerson}>
      <input type="hidden" name="id" value={personId} />
      <button
        type="submit"
        onClick={(event) => {
          if (
            !confirm(
              "Delete this person and all their entries? This cannot be undone."
            )
          ) {
            event.preventDefault();
          }
        }}
        className="inline-flex items-center justify-center rounded-lg border border-danger/30 bg-surface px-3.5 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
      >
        Delete person
      </button>
    </form>
  );
}
