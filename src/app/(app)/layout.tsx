import Link from "next/link";
import { logout } from "@/actions/auth";
import { MobileNav } from "@/components/shell/mobile-nav";
import { SideNav } from "@/components/shell/nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-paper flex flex-col">
      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 border-r border-rule bg-surface lg:block print:hidden">
        <SideNav />
      </aside>

      {/* Mobile + tablet: sticky top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-rule bg-surface/95 px-4 py-2.5 backdrop-blur-md lg:hidden print:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-ink text-xs font-bold text-paper shadow-[0_1px_2px_0_rgba(30,27,24,0.12)]">
            ₹
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink">Ledger</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-rule/30 hover:text-ink active:bg-rule/50"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Main content area with safe padding for bottom nav on mobile */}
      <main className="flex-1 lg:pl-56">
        <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-24 lg:pb-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav bar */}
      <MobileNav />
    </div>
  );
}
