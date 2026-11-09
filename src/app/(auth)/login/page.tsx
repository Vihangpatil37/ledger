import { redirect } from "next/navigation";
import { getOwner } from "@/server/session";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  if (await getOwner()) redirect("/");

  return (
    <main className="flex min-h-svh items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-ink text-lg font-bold text-paper shadow-[0_2px_4px_0_rgba(30,27,24,0.18)] ring-1 ring-ink/10">
            ₹
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Ledger
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted">
            Khata · Bahi · Personal Accounting
          </p>
        </div>
        <div className="rounded-2xl border border-rule bg-surface p-6 sm:p-7 shadow-[0_4px_16px_0_rgba(30,27,24,0.05)]">
          <LoginForm next={typeof params.next === "string" ? params.next : undefined} />
        </div>
        <p className="mt-6 text-center text-xs text-muted/80">
          Stateless, end-to-end encrypted private session
        </p>
      </div>
    </main>
  );
}
