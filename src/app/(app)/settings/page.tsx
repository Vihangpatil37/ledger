import Link from "next/link";
import { redirect } from "next/navigation";
import { DataBackupSection } from "@/components/settings/data-backup";
import { OwnerUpiForm } from "@/components/settings/owner-upi-form";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { ThemeSwitcher } from "@/components/shell/theme-switcher";
import { getOwnerProfile } from "@/server/readers";
import { getSession } from "@/server/session";
import { getServerTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Chai Ledger" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const [profile, { t }] = await Promise.all([
    getOwnerProfile(),
    getServerTranslations(),
  ]);
  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="border-b border-rule/50 pb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <span aria-hidden="true">←</span> {t("settings.backToDashboard")}
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-4xl">
              {t("settings.title")}
            </h1>
            <p className="font-mono text-xs text-muted mt-1">
              {t("settings.signedInAs")} <span className="font-bold text-ink">{profile.email}</span>
            </p>
          </div>

          <Link
            href="/trash"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-rule bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:bg-paper transition-all focus-visible:outline-2 focus-visible:outline-focus"
          >
            <span aria-hidden="true">🗑️</span>
            <span>{t("nav.trash")}</span>
          </Link>
        </div>
      </div>

      {/* Appearance & Theme Card */}
      <section className="rounded-2xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_12px_0_rgba(30,27,24,0.04)] flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink tracking-tight">
            {t("settings.themeTitle")}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {t("settings.themeSubtitle")}
          </p>
        </div>
        <div className="pt-1">
          <ThemeSwitcher />
        </div>
      </section>

      {/* Language Preference Card */}
      <section className="rounded-2xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_12px_0_rgba(30,27,24,0.04)] flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink tracking-tight">
            {t("settings.languageTitle")}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {t("settings.languageSubtitle")}
          </p>
        </div>
        <div className="pt-1">
          <LanguageSwitcher />
        </div>
      </section>

      {/* Payment Information Card (UPI) */}
      <OwnerUpiForm profile={profile} />

      {/* Data Backup & Restore Card */}
      <DataBackupSection />
    </div>
  );
}
