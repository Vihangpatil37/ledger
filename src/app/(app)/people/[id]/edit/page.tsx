import Link from "next/link";
import { notFound } from "next/navigation";
import { DeletePersonForm } from "@/components/people/delete-person-form";
import { PersonForm } from "@/components/people/person-form";
import { idSchema } from "@/lib/validation";
import { getPersonDetail } from "@/server/readers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit person" };

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const detail = await getPersonDetail(id);
  if (!detail) notFound();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-rule/50 pb-5">
        <Link
          href={`/people/${detail.id}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <span>←</span> Back to {detail.name}
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Edit Person
        </h1>
      </div>

      <PersonForm
        person={{ id: detail.id, name: detail.name, phone: detail.phone }}
      />

      <section className="rounded-xl border border-danger/25 bg-danger-light/40 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-danger">Delete Record</h2>
        <p className="text-xs text-muted">
          Removing this person permanently deletes their entire ledger history.
        </p>
        <div className="pt-2">
          <DeletePersonForm personId={detail.id} />
        </div>
      </section>
    </div>
  );
}
