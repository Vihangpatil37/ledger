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
