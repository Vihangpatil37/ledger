"use client";

import { Button } from "@/components/ui";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-rule bg-surface px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-danger-light text-sm font-bold text-danger">
        !
      </div>
      <p className="text-sm font-semibold text-ink">
        Something went wrong
      </p>
      <p className="mt-1 text-xs text-muted">
        Unable to load your ledger data right now. Please check your connection and try again.
      </p>
      <div className="mt-4">
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
      </div>
    </div>
  );
}
