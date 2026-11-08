import "server-only";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing env var ${key} — set it in .env.local (see .env.example).`
    );
  }
  return value.trim();
}

/**
 * Secrets are read lazily (on first use, not at import time) so that
 * `next build` and page-data collection never require runtime env vars.
 */

export function getMongoUri(): string {
  return required("MONGODB_URI");
}

export function getSessionSecret(): string {
  return required("SESSION_SECRET");
}

export const MONGODB_DB = process.env.MONGODB_DB?.trim() || "ledger";
