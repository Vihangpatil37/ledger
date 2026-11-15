import Link from "next/link";
import { redirect } from "next/navigation";
import { OwnerUpiForm } from "@/components/settings/owner-upi-form";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { getOwnerProfile } from "@/server/readers";
import { getServerTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Chai Ledger" };

export default async function SettingsPage() {
  const profile = await getOwnerProfile();
  if (!profile) {
    redirect("/login");
  }

  const { t } = await getServerTranslations();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-rule/50 pb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <span>←</span> Back to Dashboard
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("settings.title")}
        </h1>
        <p className="font-mono text-xs text-muted mt-1">
          {t("settings.signedInAs")} <span className="font-bold text-ink">{profile.email}</span>
        </p>
      </div>

      {/* Language Preferences Card */}
      <section className="rounded-xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_8px_0_rgba(30,27,24,0.03)] space-y-3">
        <div>
          <h2 className="text-sm font-bold text-ink tracking-tight">
            {t("settings.languageTitle")}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {t("settings.languageSubtitle")}
          </p>
        </div>
        <LanguageSwitcher variant="card" />
      </section>

      <OwnerUpiForm profile={profile} />
    </div>
  );
}
