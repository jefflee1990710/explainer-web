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
      className={`director-dock-stage relative flex min-h-full w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[#fafafa] text-[#12141c] selection:bg-[#c6f24b] selection:text-[#12141c] ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 75% 45% at 50% 15%, rgba(198, 242, 75, 0.14), transparent 70%)",
      }}
    >
      {topLeft || topRight ? (
        <div className="sticky top-0 z-20 flex w-full flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 bg-white/85 px-4 py-2.5 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">{topLeft}</div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">{topRight}</div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>

      {bottomContent ? (
        <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
          {bottomContent}
        </div>
      ) : null}
    </div>
  );
}
