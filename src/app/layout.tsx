import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n/server";
import { ThemeProvider } from "@/lib/theme/client";
import { THEME_COOKIE, type Theme } from "@/lib/theme/types";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ledger",
    template: "%s · Ledger",
  },
  description: "A fast, tactile, and privacy-focused personal khata book.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ledger",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f6f0",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  let rawTheme: string | undefined;
  try {
    const cookieStore = await cookies();
    rawTheme = cookieStore.get(THEME_COOKIE)?.value;
  } catch {
    // cookies() unavailable outside request context
  }

  const initialTheme: Theme =
    rawTheme === "light" || rawTheme === "dark" || rawTheme === "system"
      ? rawTheme
      : "system";

  const themeClass = initialTheme === "dark" ? "dark" : "";

  return (
    <html lang={locale} className={themeClass} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var c=(document.cookie.match(/(?:^|; )theme=([^;]*)/)||[])[1];var t=s||c||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider initialTheme={initialTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
