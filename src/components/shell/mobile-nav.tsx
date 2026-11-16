"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/client";

export function MobileNav({ isStaff }: { isStaff?: boolean }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (isStaff) return null;

  const isHome = pathname === "/";
  const isAddPerson = pathname === "/people/new";
  const isSettings = pathname === "/settings";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-30 border-t border-rule bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] lg:hidden print:hidden"
    >
      <div
        className={`grid ${
          isStaff ? "grid-cols-2" : "grid-cols-3"
        } h-14 max-w-md mx-auto items-center px-4`}
      >
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            isHome ? "text-ink font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-5 ${isHome ? "text-ink" : "text-muted"}`}
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-[11px] leading-none">{t("nav.people")}</span>
        </Link>

        <Link
          href="/people/new"
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            isAddPerson ? "text-ink font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          <div
            className={`flex size-6 items-center justify-center rounded-full transition-colors ${
              isAddPerson
                ? "bg-ink text-white"
                : "border border-rule bg-paper text-muted"
            }`}
          >
            <span className="text-sm font-bold leading-none">+</span>
          </div>
          <span className="text-[11px] leading-none">{t("nav.addPerson")}</span>
        </Link>

        {!isStaff ? (
          <Link
            href="/settings"
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
              isSettings ? "text-ink font-semibold" : "text-muted hover:text-ink"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-5 ${isSettings ? "text-ink" : "text-muted"}`}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="text-[11px] leading-none">{t("nav.settings")}</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
