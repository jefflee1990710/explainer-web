"use client";

import Link from "next/link";
import { useRouteTransition } from "@/presentation/studio/route-transition";
import { isStudioNavActive } from "@/presentation/studio/studio-nav-active";

// Header shortcut into the studio canvas. Same /app/canvas link the rest of the app uses.
export function StudioHeaderCanvasLink() {
  const { activePathname } = useRouteTransition();
  const active = isStudioNavActive(activePathname, "/app/canvas");

  return (
    <Link
      href="/app/canvas"
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[var(--studio-fill)] text-[var(--studio-ink)]"
          : "text-[var(--studio-muted)] hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)]"
      }`}
    >
      <span>Canvas</span>
    </Link>
  );
}
