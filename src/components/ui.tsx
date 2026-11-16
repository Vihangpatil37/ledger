import type { ComponentProps, ReactNode } from "react";
import { formatMoney } from "@/lib/money";

export function Spinner({
  className = "size-4",
  ariaLabel = "Loading",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`animate-spin ${className}`}
      aria-label={ariaLabel}
      role="status"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

const VARIANTS = {
  primary:
    "bg-ink text-paper hover:bg-ink/90 active:scale-[0.98] active:bg-ink focus-visible:outline-focus shadow-[0_1px_2px_0_rgba(30,27,24,0.15)]",
  outline:
    "border border-rule bg-surface text-ink hover:bg-paper hover:border-rule active:scale-[0.98] active:bg-rule/20 focus-visible:outline-focus shadow-[0_1px_2px_0_rgba(30,27,24,0.04)]",
  danger:
    "bg-danger text-white hover:bg-danger/90 active:scale-[0.98] active:bg-danger focus-visible:outline-danger shadow-[0_1px_2px_0_rgba(185,56,38,0.2)]",
  ghost:
    "text-muted hover:bg-rule/30 hover:text-ink active:scale-[0.98] active:bg-rule/50 focus-visible:outline-focus",
  whatsapp:
    "bg-whatsapp text-white hover:bg-whatsapp-hover active:scale-[0.98] focus-visible:outline-whatsapp shadow-[0_1px_2px_0_rgba(18,140,126,0.25)]",
} as const;

export function Button({
  variant = "primary",
  isLoading = false,
  className = "",
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  isLoading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 select-none cursor-pointer ${VARIANTS[variant]} ${className}`}
    >
      {isLoading ? <Spinner className="size-4 shrink-0" /> : null}
      {children}
    </button>
  );
}

const BADGE_VARIANTS = {
  neutral: "border border-rule bg-paper text-muted",
  debit: "border border-debit/30 bg-debit-light text-debit",
  credit: "border border-credit/30 bg-credit-light text-credit",
  warning: "border border-warning/30 bg-warning-light text-warning font-semibold",
  whatsapp: "border border-whatsapp/30 bg-whatsapp-light text-whatsapp font-semibold",
  outline: "border border-rule bg-surface text-ink",
} as const;

export function Badge({
  variant = "neutral",
  size = "md",
  className = "",
  children,
  ...props
}: ComponentProps<"span"> & {
  variant?: keyof typeof BADGE_VARIANTS;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "px-1.5 py-0.2 text-[10px]" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wider ${sizeClass} ${BADGE_VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function IconButton({
  ariaLabel,
  title,
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & {
  ariaLabel: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-ink active:scale-[0.96] active:bg-rule/30 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-focus ${className}`}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "w-full min-h-[44px] rounded-xl border border-rule bg-surface px-3.5 py-2.5 text-base sm:text-sm text-ink placeholder:text-faint/80 focus-visible:border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 transition-all duration-150 shadow-[inset_0_1px_2px_0_rgba(30,27,24,0.03)]";

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
