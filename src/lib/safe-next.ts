/**
 * Allow-list for post-login redirects: internal absolute paths only.
 * Rejects protocol-relative ("//evil.com") and other exotic inputs.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/"
): string {
  if (
    raw &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("\n") &&
    !raw.includes("\\")
  ) {
    return raw;
  }
  return fallback;
}
