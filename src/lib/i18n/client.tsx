"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { en, type TranslationKey } from "./dictionaries/en";
import { gu } from "./dictionaries/gu";
import { hi } from "./dictionaries/hi";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./types";

const DICTIONARIES = {
  en,
  gu,
  hi,
};

type LanguageContextType = {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => en[key] ?? key,
});

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      // Persist to cookie (1 year duration)
      if (typeof document !== "undefined") {
        document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        try {
          localStorage.setItem(LOCALE_COOKIE, newLocale);
        } catch {
          // ignore localStorage security errors in sandboxes
        }
      }
      // Re-trigger server component render so server components update
      router.refresh();
    },
    [router]
  );

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = DICTIONARIES[locale] || en;
      return dict[key] ?? en[key] ?? key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
