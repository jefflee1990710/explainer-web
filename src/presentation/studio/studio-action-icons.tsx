// Small marks for the editor header and the clip toolbar.

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ReferenceStillsIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
      <path d="m3 16 4.6-4 3.2 3.1 2.4-2.2L21 16" />
    </svg>
  );
}

export function CaptionsIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 11.5h4M7 14.5h2.4M13 11.5h4M13 14.5h2.6" />
    </svg>
  );
}

export function FinishMissingIcon({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.4 12.2 2.4 2.4 4.8-5.2" />
    </svg>
  );
}

export function AllFramesIcon({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="3.5" y="4" width="12" height="9" rx="1.4" />
      <rect x="8.5" y="11" width="12" height="9" rx="1.4" />
    </svg>
  );
}

export function AddClipIcon({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function DeleteClipIcon({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M5 7h14M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M8 7l.6 12.2A1.5 1.5 0 0 0 10.1 20.5h3.8a1.5 1.5 0 0 0 1.5-1.3L16 7" />
    </svg>
  );
}
