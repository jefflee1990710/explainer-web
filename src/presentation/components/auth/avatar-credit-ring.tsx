"use client";

// Remaining credits as a 3px ring around the avatar. The track is the spent share.
export function AvatarCreditRing({
  ratio,
  label,
  children,
}: {
  ratio: number;
  label: string;
  children: React.ReactNode;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);

  return (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center">
      <svg
        viewBox="0 0 40 40"
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <circle cx="20" cy="20" r="18.5" fill="none" stroke="var(--studio-line)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r="18.5"
          fill="none"
          stroke="var(--studio-teal)"
          strokeWidth="3"
          pathLength={100}
          strokeDasharray="100 100"
          strokeDashoffset={100 - percent}
          strokeLinecap="butt"
        />
      </svg>
      {children}
    </span>
  );
}
