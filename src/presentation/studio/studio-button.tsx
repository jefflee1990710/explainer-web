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
      ? "bg-[var(--studio-ink)] text-white"
      : "border border-[var(--studio-line)] bg-[var(--studio-panel)] text-[var(--studio-ink)]";
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${face} ${className}`}
      {...props}
    />
  );
}
