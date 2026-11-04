"use client";

import type { ReactNode } from "react";

export function DirectorDockStage({
  topLeft,
  topRight,
  children,
  bottomContent,
  className = "",
}: {
  topLeft?: ReactNode;
  topRight?: ReactNode;
  children: ReactNode;
  bottomContent?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`director-dock-stage relative flex min-h-full w-full flex-1 flex-col overflow-y-auto bg-[#0c0d10] text-zinc-100 selection:bg-[#d8ff3e] selection:text-[#111318] ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% 18%, rgba(216, 255, 62, 0.045), transparent 70%)",
      }}
    >
      {topLeft || topRight ? (
        <div className="sticky top-0 z-30 flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">{topLeft}</div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">{topRight}</div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-10 lg:pl-16">
        {children}
      </div>

      {bottomContent ? (
        <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8">
          {bottomContent}
        </div>
      ) : null}
    </div>
  );
}
