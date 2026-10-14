"use client";

import type { ReactNode } from "react";

// Hover hint under a studio control. The wrapper gets the pointer, so a disabled button still shows it.
export function StudioHint({
  hint,
  align = "center",
  children,
}: {
  hint: string;
  align?: "center" | "end";
  children: ReactNode;
}) {
  if (!hint) return children;
  const place =
    align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span className="group/hint relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute top-[calc(100%+6px)] z-[80] w-max max-w-56 rounded-lg bg-[#12141c] px-2.5 py-1.5 text-center text-[11px] leading-snug font-medium text-white opacity-0 shadow-lg transition duration-150 group-hover/hint:visible group-hover/hint:opacity-100 group-focus-within/hint:visible group-focus-within/hint:opacity-100 ${place}`}
      >
        {hint}
      </span>
    </span>
  );
}
