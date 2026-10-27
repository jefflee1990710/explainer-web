"use client";

import { useRef } from "react";

// Drag the shared edge of a desk column. `grow` is which way makes the column wider.
export function ColumnResizeHandle({
  label,
  value,
  min,
  max,
  grow,
  onDrag,
  onCommit,
  track = "pill",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  grow: "left" | "right";
  onDrag: (width: number) => void;
  onCommit: (width: number) => void;
  // `edge` draws a full-height divider. `pill` keeps the short editor grip.
  track?: "pill" | "edge";
}) {
  const dragRef = useRef<{ x: number; width: number } | null>(null);

  function widthAt(clientX: number) {
    const drag = dragRef.current;
    if (!drag) return value;
    const delta = grow === "right" ? clientX - drag.x : drag.x - clientX;
    return drag.width + delta;
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer can already be gone if the gesture ends immediately.
    }
    dragRef.current = { x: event.clientX, width: value };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    onDrag(widthAt(event.clientX));
  }

  function finish(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    onCommit(widthAt(event.clientX));
    dragRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Capture may already be released.
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const wider = grow === "right" ? event.key === "ArrowRight" : event.key === "ArrowLeft";
    const narrower = grow === "right" ? event.key === "ArrowLeft" : event.key === "ArrowRight";
    if (!wider && !narrower) return;
    event.preventDefault();
    onCommit(value + (wider ? 24 : -24));
  }

  return (
    <button
      type="button"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onKeyDown={onKeyDown}
      className="hidden h-full w-3 shrink-0 cursor-ew-resize touch-none items-center justify-center lg:flex"
    >
      <span
        className={
          track === "edge"
            ? "h-full w-px bg-[var(--studio-line)]"
            : "h-10 w-1 rounded-full bg-accent-ink/25"
        }
      />
    </button>
  );
}
