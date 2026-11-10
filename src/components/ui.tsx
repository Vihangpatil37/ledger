import type { ComponentProps } from "react";
import { formatMoney } from "@/lib/money";

const VARIANTS = {
  primary:
    "bg-ink text-paper hover:bg-ink/90 active:scale-[0.98] active:bg-ink focus-visible:outline-focus shadow-[0_1px_2px_0_rgba(30,27,24,0.15)]",
  outline:
    "border border-rule bg-surface text-ink hover:bg-paper hover:border-rule active:scale-[0.98] active:bg-rule/20 focus-visible:outline-focus shadow-[0_1px_2px_0_rgba(30,27,24,0.04)]",
  danger:
    "bg-danger text-white hover:bg-danger/90 active:scale-[0.98] active:bg-danger focus-visible:outline-danger shadow-[0_1px_2px_0_rgba(185,56,38,0.2)]",
  ghost:
    "text-muted hover:bg-rule/30 hover:text-ink active:scale-[0.98] active:bg-rule/50 focus-visible:outline-focus",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 select-none ${VARIANTS[variant]} ${className}`}
    />
  );
}

export const inputClass =
  "w-full min-h-[44px] rounded-lg border border-rule bg-surface px-3.5 py-2.5 text-base sm:text-sm text-ink placeholder:text-faint/80 focus-visible:border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 transition-all duration-150 shadow-[inset_0_1px_2px_0_rgba(30,27,24,0.03)]";

export function Label({
  className = "",
  ...props
}: ComponentProps<"label">) {
  return (
    <label
      {...props}
      className={`block text-xs font-semibold tracking-wide uppercase text-muted ${className}`}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-danger">{message}</p>;
}

/** Renders money with grouped Indian digits; amounts always stay strings. */
export function Money({
  amount,
  abs = false,
  className = "",
}: {
  amount: string | number;
  abs?: boolean;
  className?: string;
}) {
  const value = Number(amount);
  return (
    <span className={`font-mono tabular-nums tracking-tight ${className}`}>
      {formatMoney(abs ? Math.abs(value) : value)}
    </span>
  );
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-rule bg-surface shadow-[0_1px_3px_0_rgba(30,27,24,0.04)] ${
        props.children ? "p-4 sm:p-5" : ""
      } ${className}`}
    />
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-rule bg-surface/70 px-4 py-8 sm:px-6 sm:py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function StampBadge({
  status,
  className = "",
}: {
  status: "settled" | "udhar" | "received";
  className?: string;
}) {
  if (status === "settled") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase bg-credit-light text-credit border border-credit/30 ${className}`}
      >
        Settled
      </span>
    );
  }
  if (status === "udhar") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase bg-debit-light text-debit border border-debit/30 ${className}`}
      >
        Udhar
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase bg-credit-light text-credit border border-credit/30 ${className}`}
    >
      Received
    </span>
  );
}
