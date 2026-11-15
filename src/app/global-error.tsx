"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-svh items-center justify-center bg-[#f8f6f0] px-4 py-12 text-[#1e1b18] antialiased">
        <div className="w-full max-w-md rounded-2xl border border-[#e5e0d8] bg-white p-6 text-center shadow-lg sm:p-8">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
            !
          </div>
          <h2 className="text-lg font-bold">Application Error</h2>
          <p className="mt-1 text-xs text-[#78716c]">
            An unexpected error occurred. Please try refreshing the application.
          </p>
          <button
            onClick={() => reset()}
            className="mt-5 inline-flex min-h-[38px] items-center justify-center rounded-xl bg-[#1e1b18] px-4 py-2 text-xs font-semibold text-[#f8f6f0] transition-colors hover:bg-black cursor-pointer"
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
