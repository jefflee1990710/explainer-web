"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  FILMSTRIP_HEIGHT_DEFAULT,
  FILMSTRIP_HEIGHT_KEY,
  FILMSTRIP_HEIGHT_MAX,
  FILMSTRIP_HEIGHT_MIN,
  clampFilmstripHeight,
  readFilmstripHeight,
} from "@/presentation/studio/filmstrip-height";

// Bottom clip strip. Height starts at 300px and a drag on the top edge resizes it.
export function FilmstripPane({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [height, setHeight] = useState(FILMSTRIP_HEIGHT_DEFAULT);
  const dragRef = useRef<{ y: number; height: number } | null>(null);

  useEffect(() => {
    setHeight(readFilmstripHeight(window.localStorage.getItem(FILMSTRIP_HEIGHT_KEY)));
  }, []);

  function save(next: number) {
    const height = clampFilmstripHeight(next);
    setHeight(height);
    window.localStorage.setItem(FILMSTRIP_HEIGHT_KEY, String(height));
    return height;
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer can already be gone if the gesture ends immediately.
    }
    dragRef.current = { y: event.clientY, height };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setHeight(clampFilmstripHeight(drag.height + (drag.y - event.clientY)));
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    save(drag.height + (drag.y - event.clientY));
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
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    save(height + (event.key === "ArrowUp" ? 16 : -16));
  }

  return (
    <section
      aria-label={t("production.shell.timelineAria")}
      className="flex shrink-0 flex-col border-t border-[var(--studio-line)] bg-[var(--studio-canvas)]"
      style={{ height, ["--filmstrip-h" as string]: `${height}px` }}
    >
      <button
        type="button"
        role="separator"
        aria-orientation="horizontal"
        aria-label={t("production.shell.timelineResize")}
        aria-valuemin={FILMSTRIP_HEIGHT_MIN}
        aria-valuemax={FILMSTRIP_HEIGHT_MAX}
        aria-valuenow={height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="flex h-3 shrink-0 cursor-ns-resize touch-none items-center justify-center"
      >
        <span className="h-1 w-10 rounded-full bg-accent-ink/25" />
      </button>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">{children}</div>
    </section>
  );
}
