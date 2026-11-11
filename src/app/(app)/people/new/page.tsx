import Link from "next/link";
import { PersonForm } from "@/components/people/person-form";

export const metadata = { title: "Add person" };

export default function NewPersonPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-rule/50 pb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <span>←</span> Back to dashboard
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-paper font-bold text-base shadow-2xs">
            +
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Add New Contact
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted">
              Add a person to your khata to begin recording Udhar and payments.
            </p>
          </div>
        </div>
      </div>
      <PersonForm />
    </div>
  );
}
