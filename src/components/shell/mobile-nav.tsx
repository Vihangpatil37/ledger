"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isAddPerson = pathname === "/people/new";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-30 border-t border-rule bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] lg:hidden print:hidden"
    >
      <div className="grid grid-cols-2 h-14 max-w-md mx-auto items-center px-4">
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
          <span className="text-[11px] leading-none">People</span>
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
          <span className="text-[11px] leading-none">Add person</span>
        </Link>
      </div>
    </nav>
  );
}
