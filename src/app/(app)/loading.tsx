export default function AppLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center py-20 text-xs font-medium text-muted"
    >
      <span className="inline-block size-3 animate-spin rounded-full border-2 border-rule border-t-ink mr-2" />
      Loading ledger…
    </div>
  );
}
