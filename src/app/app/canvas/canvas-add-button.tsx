"use client";

// Shown over a selected sidebar tile. The first click only selects; this plus adds it.

import { Plus } from "lucide-react";

export function CanvasAddButton({
  label,
  dense = false,
  onAdd,
}: {
  label: string;
  dense?: boolean;
  onAdd: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onAdd();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onAdd();
      }}
      className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/40"
    >
      <Plus
        aria-hidden
        strokeWidth={1.75}
        className={`text-white/75 ${dense ? "h-5 w-5" : "h-7 w-7"}`}
      />
    </div>
  );
}
