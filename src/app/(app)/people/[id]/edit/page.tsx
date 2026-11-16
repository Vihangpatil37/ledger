import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeletePersonForm } from "@/components/people/delete-person-form";
import { PersonForm } from "@/components/people/person-form";
import { getServerTranslations } from "@/lib/i18n/server";
import { idSchema } from "@/lib/validation";
import { getPersonDetail } from "@/server/readers";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit person" };

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  if (session.role === "STAFF") {
    redirect(`/people/${id}`);
  }

  const detail = await getPersonDetail(id);
  if (!detail) notFound();

  const { t } = await getServerTranslations();

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="border-b border-rule/50 pb-5">
        <Link
          href={`/people/${detail.id}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span> {t("common.back")} · {detail.name}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("person.editPerson")}
        </h1>
      </div>

      <PersonForm
        person={{
          id: detail.id,
          name: detail.name,
          phone: detail.phone,
        }}
      />

      <section className="rounded-2xl border border-danger/25 bg-danger-light/40 p-5 flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-danger">{t("form.deletePerson")}</h2>
        <p className="text-xs text-muted">
          {t("form.deletePersonWarning")}
        </p>
        <div className="pt-2">
          <DeletePersonForm personId={detail.id} />
        </div>
      </section>
    </div>
  );
}
