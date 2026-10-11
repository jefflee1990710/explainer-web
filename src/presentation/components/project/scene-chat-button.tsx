"use client";

// Opens the clip-wide director chat from the preview corner.
export function SceneChatButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`absolute right-3 top-3 z-20 min-h-9 cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold leading-tight transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "bg-accent text-white shadow-[2px_2px_0_0_#12141c]"
          : "border border-accent-ink/15 bg-paper text-accent-ink"
      }`}
    >
      {label}
    </button>
  );
}
