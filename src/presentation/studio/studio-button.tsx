"use client";

import type { ButtonHTMLAttributes } from "react";

// Rectangular desk buttons for the editor header and inspector.
export function StudioButton({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  const face =
    variant === "primary"
      ? "bg-[#12141c] text-[#c6f24b] hover:bg-black"
      : "bg-[var(--studio-fill)] text-[var(--studio-ink)] hover:bg-zinc-100";
  return (
    <button
      type={type}
      className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${face} ${className}`}
      {...props}
    />
  );
}
