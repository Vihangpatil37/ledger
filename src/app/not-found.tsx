import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-ink text-lg font-bold text-paper shadow-sm">
          404
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Page Not Found
        </h1>
        <p className="mt-2 text-xs text-muted sm:text-sm">
          The khata record or page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-ink px-5 py-2 text-xs font-semibold text-paper shadow-sm transition-all hover:bg-ink/90 active:scale-[0.98]"
          >
            Return to Ledger
          </Link>
        </div>
      </div>
    </main>
  );
}
