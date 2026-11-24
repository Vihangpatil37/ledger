import type { SVGProps } from "react";

export interface VoiceIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  withBase?: boolean;
  active?: boolean;
}

/**
 * Standardized Voice Khata microphone icon with complete cradle and footing base.
 */
export function VoiceKhataIcon({
  size = 18,
  className = "size-4.5",
  withBase = true,
  active = false,
  ...props
}: VoiceIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${active ? "animate-pulse" : ""}`}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      {withBase && <line x1="8" y1="22" x2="16" y2="22" />}
    </svg>
  );
}
