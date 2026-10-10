"use client";

// Opens the chat that rewrites this still's image prompt.
export function FramePromptChatButton({
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
      className={`mt-1.5 w-full min-h-9 cursor-pointer rounded-full px-2 py-1 text-center text-[11px] font-semibold leading-tight transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "bg-accent text-white shadow-[2px_2px_0_0_#12141c]"
          : "border border-accent-ink/15 bg-paper text-accent-ink"
      }`}
    >
      {label}
    </button>
  );
}
