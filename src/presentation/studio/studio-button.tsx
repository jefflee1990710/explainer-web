"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

// Rectangular desk buttons for the editor header and inspector.
export const StudioButton = forwardRef(function StudioButton(
  {
    variant = "primary",
    className = "",
    type = "button",
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger";
  },
  ref: React.Ref<HTMLButtonElement>,
) {
  const face =
    variant === "primary"
      ? "bg-[#12141c] text-[#c6f24b] hover:bg-black"
      : variant === "danger"
        ? "border border-red-200 bg-red-600 text-white hover:bg-red-700"
        : "bg-[var(--studio-fill)] text-[var(--studio-ink)] hover:bg-zinc-100";
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${face} ${className}`}
      {...props}
    />
  );
});
