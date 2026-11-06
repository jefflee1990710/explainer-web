"use client";

import { usePathname } from "next/navigation";
import { isFullBleedStudioPath } from "@/presentation/components/app/director-dock/director-dock-config";

// Shared instant skeleton shown while an /app route streams its server data.
export function StudioRouteSkeleton() {
  const pathname = usePathname() || "";
  const isCreateStudio = isFullBleedStudioPath(pathname);

  if (isCreateStudio) {
    return (
      <div
        className="flex min-h-full w-full flex-1 flex-col items-center justify-center bg-[var(--studio-canvas)] px-4 py-8 sm:px-6"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex w-full max-w-4xl flex-col items-center gap-4">
          {/* Fanned Hero Showcase Placeholder */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="relative flex h-36 w-full max-w-md items-center justify-center">
              <div className="h-24 w-36 -translate-x-20 animate-pulse rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-fill)]" />
              <div className="h-24 w-36 translate-x-20 animate-pulse rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-fill)]" />
              <div className="absolute h-32 w-56 animate-pulse rounded-2xl border-2 border-[var(--studio-line)] bg-[var(--studio-panel)] shadow-md" />
            </div>
            <div className="h-8 w-64 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
          </div>

          {/* Director Panel Placeholder */}
          <div className="w-full rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-28 animate-pulse rounded-lg bg-[var(--studio-fill)]" />
              <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--studio-fill)]" />
            </div>
            <div className="flex flex-wrap items-stretch gap-2.5">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
              <div className="h-14 min-w-[185px] flex-1 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
              <div className="h-14 min-w-[185px] flex-1 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
              <div className="h-14 min-w-[185px] flex-1 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
            </div>
          </div>

          {/* Composer / Workbench Placeholder */}
          <div className="flex w-full items-stretch gap-3 rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-4">
            <div className="flex flex-1 flex-col justify-between gap-3">
              <div className="h-16 w-full animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
                <div className="h-9 w-24 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
                <div className="h-9 w-28 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
              </div>
            </div>
            <div className="h-24 w-28 shrink-0 animate-pulse rounded-2xl bg-[#c6f24b]/60" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-8 w-48 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-[var(--studio-fill)]" />
      </div>
    </div>
  );
}
