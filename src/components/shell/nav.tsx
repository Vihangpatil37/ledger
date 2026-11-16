"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries/en";

const ITEMS: Array<{
  href: string;
  key: TranslationKey;
  icon: React.ReactNode;
}> = [
  {
    href: "/",
    key: "nav.dashboard",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
      >
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    href: "/people/new",
    key: "nav.addPerson",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    href: "/trash",
    key: "nav.trash",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </svg>
    ),
  },
  {
    href: "/settings",
    key: "nav.settings",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function SideNav({
  isStaff,
  staffName,
}: {
  isStaff?: boolean;
  staffName?: string;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const items = isStaff
    ? ITEMS.filter(
        (item) =>
          item.href !== "/trash" &&
          item.href !== "/settings" &&
          item.href !== "/people/new"
      )
    : ITEMS;

  return (
    <nav className="flex h-full flex-col justify-between">
      <div>
        <div className="px-5 py-5 border-b border-rule/50">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-ink text-sm font-bold text-paper shadow-[0_1px_2px_0_rgba(30,27,24,0.15)] ring-1 ring-ink/10">
              ₹
            </span>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-ink block leading-none">
                Ledger
              </span>
              {isStaff ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-credit font-semibold block mt-1.5 leading-none">
                  Munim · {staffName ?? "Counter"}
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted block mt-1.5 leading-none">
                  {t("nav.brandSub")}
                </span>
              )}
            </div>
          </Link>
        </div>

        <div className="space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                  active
                    ? "bg-ink text-paper shadow-[0_1px_2px_0_rgba(30,27,24,0.12)] font-semibold"
                    : "font-medium text-muted hover:bg-rule/30 hover:text-ink active:scale-[0.99]"
                }`}
              >
                {item.icon}
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer language toggle & sign out with ample padding to prevent dev badge overlap */}
      <div className="p-3 pb-12 border-t border-rule/40 space-y-2">
        <div className="px-1">
          <LanguageSwitcher variant="compact" className="w-full justify-between" />
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-muted transition-colors hover:bg-danger-light hover:text-danger active:bg-danger-light/80 cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 shrink-0"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{t("nav.signOut")}</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
