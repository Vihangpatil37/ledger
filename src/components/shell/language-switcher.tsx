"use client";

import { useLanguage } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n/types";

export function LanguageSwitcher({
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "card";
  className?: string;
}) {
  const { locale, setLocale } = useLanguage();

  if (variant === "card") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${className}`}>
        {LOCALES.map((item) => {
          const isSelected = locale === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setLocale(item.code)}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "border-ink bg-surface shadow-xs ring-1 ring-ink"
                  : "border-rule/80 bg-paper/60 hover:bg-surface hover:border-rule"
              }`}
            >
              <div>
                <span className="font-semibold text-sm text-ink block">
                  {item.nativeName}
                </span>
                <span className="text-xs text-muted block mt-0.5">
                  {item.label}
                </span>
              </div>
              <span
                className={`size-4 rounded-full border flex items-center justify-center text-[10px] ${
                  isSelected
                    ? "border-ink bg-ink text-paper font-bold"
                    : "border-rule bg-surface"
                }`}
                aria-hidden="true"
              >
                {isSelected ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact segmented toggle (for sidebar & mobile header)
  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-grid grid-cols-3 items-center rounded-xl border border-rule bg-paper p-1 shadow-2xs ${className}`}
    >
      {LOCALES.map((item) => {
        const isSelected = locale === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLocale(item.code)}
            aria-pressed={isSelected}
            title={item.label}
            className={`flex min-h-[36px] sm:min-h-[32px] items-center justify-center px-2 py-1 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-focus ${
              isSelected
                ? "bg-surface text-ink font-bold shadow-xs border border-rule/80 dark:bg-surface-subtle dark:border-rule dark:text-ink"
                : "text-muted hover:text-ink hover:bg-rule/20 border border-transparent"
            }`}
          >
            {item.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
