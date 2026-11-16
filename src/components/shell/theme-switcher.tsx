"use client";

import { useId } from "react";
import { useTheme } from "@/lib/theme/client";
import type { Theme } from "@/lib/theme/types";
import { useLanguage } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries/en";

interface ThemeOption {
  code: Theme;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  icon: (className?: string) => React.ReactNode;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    code: "light",
    labelKey: "theme.light",
    descKey: "theme.lightDesc",
    icon: (className = "size-4") => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    ),
  },
  {
    code: "dark",
    labelKey: "theme.dark",
    descKey: "theme.darkDesc",
    icon: (className = "size-4") => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ),
  },
  {
    code: "system",
    labelKey: "theme.system",
    descKey: "theme.systemDesc",
    icon: (className = "size-4") => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>
    ),
  },
];

export function ThemeSwitcher({
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "card";
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const groupId = useId();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = THEME_OPTIONS.findIndex((opt) => opt.code === theme);
    if (currentIndex === -1) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
      setTheme(THEME_OPTIONS[nextIndex].code);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
      setTheme(THEME_OPTIONS[prevIndex].code);
    }
  };

  if (variant === "card") {
    return (
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        onKeyDown={handleKeyDown}
        className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${className}`}
      >
        <span id={groupId} className="sr-only">
          {t("settings.themeTitle")}
        </span>
        {THEME_OPTIONS.map((item) => {
          const isSelected = theme === item.code;
          return (
            <button
              key={item.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setTheme(item.code)}
              className={`flex items-start justify-between p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-focus ${
                isSelected
                  ? "border-focus/80 bg-surface shadow-xs ring-2 ring-focus/20"
                  : "border-rule/80 bg-paper/60 hover:bg-surface hover:border-rule"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 transition-colors ${
                    isSelected ? "bg-focus/15 text-focus font-bold" : "bg-rule/40 text-muted"
                  }`}
                >
                  {item.icon("size-4")}
                </div>
                <div>
                  <span className="font-semibold text-sm text-ink block">
                    {t(item.labelKey)}
                  </span>
                  <span className="text-xs text-muted block mt-0.5">
                    {t(item.descKey)}
                  </span>
                </div>
              </div>
              <span
                className={`size-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 mt-0.5 transition-colors ${
                  isSelected
                    ? "border-focus bg-focus text-white font-bold"
                    : "border-rule bg-surface text-transparent"
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

  // Compact segmented toggle (for sidebar, header, login)
  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      onKeyDown={handleKeyDown}
      className={`inline-grid grid-cols-3 items-center rounded-xl border border-rule bg-paper p-1 shadow-2xs ${className}`}
    >
      {THEME_OPTIONS.map((item) => {
        const isSelected = theme === item.code;
        return (
          <button
            key={item.code}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => setTheme(item.code)}
            title={t(item.labelKey)}
            aria-label={t(item.labelKey)}
            className={`flex min-h-[36px] sm:min-h-[32px] items-center justify-center gap-1.5 px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-focus ${
              isSelected
                ? "bg-surface-subtle text-ink font-bold shadow-xs border border-rule/80 dark:border-rule/60"
                : "text-muted hover:text-ink hover:bg-rule/20 border border-transparent"
            }`}
          >
            {item.icon("size-3.5 shrink-0")}
            <span className="hidden sm:inline truncate">{t(item.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
