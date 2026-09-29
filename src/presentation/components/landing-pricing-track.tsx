"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Horizontal plan row. Auto-scrolls left → right; pauses while the pointer is over it.
export function LandingPricingTrack({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 48);
      last = now;
      const first = el.firstElementChild as HTMLElement | null;
      if (!paused.current && first && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += dt * 0.045;
        if (el.scrollLeft >= first.offsetWidth) el.scrollLeft -= first.offsetWidth;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={scroller}
      className="mt-10 flex gap-0 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
      onFocus={() => {
        paused.current = true;
      }}
      onBlur={() => {
        paused.current = false;
      }}
    >
      <div className="flex w-max shrink-0 gap-5 pr-5">{children}</div>
      <div className="flex w-max shrink-0 gap-5 pr-5 motion-reduce:hidden" aria-hidden>
        {children}
      </div>
    </div>
  );
}
