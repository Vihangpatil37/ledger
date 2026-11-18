"use client";

import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  titleId?: string;
  descriptionId?: string;
  children: ReactNode;
  className?: string;
  glass?: boolean;
};

export function Dialog({
  isOpen,
  onClose,
  titleId = "dialog-title",
  descriptionId,
  children,
  className = "",
  glass = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture the previously focused element to restore focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Initial focus into modal
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const focusable = dialogRef.current.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, button:not([aria-label="Close"])'
      );
      if (focusable) {
        focusable.focus();
      } else {
        dialogRef.current.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-50 flex justify-center backdrop-blur-xs transition-opacity animate-in fade-in duration-150 ${
        glass
          ? "items-center p-3 sm:p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          : "items-end sm:items-center p-0 sm:p-4 bg-ink/60"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={
          glass
            ? `w-full max-w-sm sm:max-w-md rounded-3xl border border-white/30 dark:border-white/10 bg-white/85 dark:bg-[#181614]/90 backdrop-blur-2xl p-3.5 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] max-h-[88dvh] sm:max-h-[90vh] flex flex-col overflow-hidden outline-none animate-in fade-in zoom-in-95 duration-150 ${className}`
            : `w-full max-w-md rounded-t-2xl border-t border-rule bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl sm:rounded-2xl sm:border max-h-[92dvh] sm:max-h-[92vh] flex flex-col overflow-hidden outline-none animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 ${className}`
        }
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`flex items-start justify-between border-b border-rule/60 pb-3.5 ${className}`}
    />
  );
}

export function DialogTitle({
  id = "dialog-title",
  className = "",
  ...props
}: ComponentProps<"h2">) {
  const hasCustomFont = className.includes("font-");
  return (
    <h2
      id={id}
      {...props}
      className={`${hasCustomFont ? "" : "font-display"} text-lg font-bold tracking-tight text-ink ${className}`}
    />
  );
}

export function DialogDescription({
  id = "dialog-description",
  className = "",
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      id={id}
      {...props}
      className={`font-mono text-xs text-muted mt-0.5 ${className}`}
    />
  );
}

export function DialogFooter({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`flex items-center justify-end gap-2.5 pt-3 border-t border-rule/50 ${className}`}
    />
  );
}

export function DialogCloseButton({
  onClose,
  ariaLabel = "Close dialog",
  className = "",
}: {
  onClose: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={ariaLabel}
      className={`inline-flex size-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink active:bg-rule/30 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-focus ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}
