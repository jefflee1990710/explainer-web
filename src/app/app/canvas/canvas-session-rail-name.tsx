"use client";

// Vertical canvas name on a collapsed side rail, under the expand button.

export function CanvasSessionRailName({ name }: { name: string }) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return (
    <div className="mt-2 flex min-h-0 w-full flex-1 justify-center overflow-hidden">
      <p
        title={trimmed}
        className="max-h-full truncate text-[11px] font-semibold tracking-wide text-white/75 [writing-mode:vertical-rl]"
      >
        {trimmed}
      </p>
    </div>
  );
}
