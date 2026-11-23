"use client";

// Immediate hint beside a canvas control. Fixed so a scrolling drawer does not clip it.

import { useEffect, useState, type ReactNode } from "react";

export function CanvasHoverHint({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!box) return;
    const hide = () => setBox(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [box]);

  function show(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setBox({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  }

  if (!label) return children;

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setBox(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setBox(null)}
    >
      {children}
      {box ? (
        <span
          role="tooltip"
          style={{ top: box.top, left: box.left }}
          className="pointer-events-none fixed z-[80] -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#12141c] px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white shadow-lg"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
