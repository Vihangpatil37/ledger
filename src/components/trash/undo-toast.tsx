"use client";

import { useEffect, useState } from "react";
import { restoreEntry, restorePerson } from "@/actions/trash";
import { useLanguage } from "@/lib/i18n/client";

export type UndoToastEventDetail = {
  id: string;
  kind: "PERSON" | "ENTRY";
  title: string;
  personId?: string;
};

export function triggerUndoToast(detail: UndoToastEventDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<UndoToastEventDetail>("chai-ledger:undo-toast", {
        detail,
      })
    );
  }
}

export function UndoToast() {
  const [toast, setToast] = useState<UndoToastEventDetail | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [isUndoing, setIsUndoing] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    function handleEvent(e: Event) {
      const customEvent = e as CustomEvent<UndoToastEventDetail>;
      if (customEvent.detail) {
        setToast(customEvent.detail);
        setCountdown(10);
      }
    }

    window.addEventListener("chai-ledger:undo-toast", handleEvent);
    return () => {
      window.removeEventListener("chai-ledger:undo-toast", handleEvent);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setToast(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [toast]);

  if (!toast) return null;

  async function handleUndo() {
    if (!toast) return;
    setIsUndoing(true);
    const fd = new FormData();
    try {
      if (toast.kind === "PERSON") {
        fd.append("id", toast.id);
        await restorePerson({}, fd);
      } else {
        fd.append("entryId", toast.id);
        if (toast.personId) fd.append("personId", toast.personId);
        await restoreEntry({}, fd);
      }
    } finally {
      setIsUndoing(false);
      setToast(null);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-rule bg-ink px-4 py-3 text-paper shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="size-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
        <span>
          {toast.title} {t("undo.itemDeleted")} ({countdown}s)
        </span>
      </div>

      <button
        type="button"
        onClick={handleUndo}
        disabled={isUndoing}
        className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-paper px-3.5 py-1.5 text-xs font-bold text-ink hover:bg-paper/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper transition-transform cursor-pointer"
      >
        {isUndoing ? "Restoring…" : t("undo.btn")}
      </button>

      <button
        type="button"
        onClick={() => setToast(null)}
        aria-label="Dismiss undo notification"
        className="flex size-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-paper/60 hover:text-paper hover:bg-white/10 transition-colors text-xs"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
