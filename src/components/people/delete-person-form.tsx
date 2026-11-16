"use client";

import { deletePerson } from "@/actions/people";
import { triggerUndoToast } from "@/components/trash/undo-toast";
import { useLanguage } from "@/lib/i18n/client";

export function DeletePersonForm({ personId }: { personId: string }) {
  const { t } = useLanguage();

  return (
    <form
      action={deletePerson}
      onSubmit={() => {
        triggerUndoToast({
          id: personId,
          kind: "PERSON",
          title: "Contact",
        });
      }}
    >
      <input type="hidden" name="id" value={personId} />
      <button
        type="submit"
        onClick={(event) => {
          if (!confirm(t("form.deletePersonWarning"))) {
            event.preventDefault();
          }
        }}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-danger/30 bg-surface px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger cursor-pointer"
      >
        {t("form.deletePerson")}
      </button>
    </form>
  );
}
