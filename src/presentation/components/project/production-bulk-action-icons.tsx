// Toolbar marks for the bulk generate actions.

const iconClass = "h-3.5 w-3.5 shrink-0";

export function AllFramesIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="4.5" width="12" height="10" rx="1.6" />
      <rect x="8.5" y="9.5" width="12" height="10" rx="1.6" />
    </svg>
  );
}

export function AllFramesVideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5.5" width="11" height="13" rx="1.6" />
      <path d="M16.5 9.2 21 12l-4.5 2.8V9.2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
