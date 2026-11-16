export type Theme = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE = "theme";
export const THEME_STORAGE_KEY = "theme";
export const DEFAULT_THEME: Theme = "system";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}
