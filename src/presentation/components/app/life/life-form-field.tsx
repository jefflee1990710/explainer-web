"use client";

import type { ReactNode } from "react";

// Reusable form field wrapper with step number, title, Required/Optional badge, hint, and optional right actions.
export function LifeFormField({
  step,
  label,
  required = false,
  hint,
  headerRight,
  children,
}: {
  step?: number;
  label: string;
  required?: boolean;
  hint?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {step ? (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-ink text-[10px] font-bold text-lime">
              {step}
            </span>
          ) : null}
          <span className="text-xs font-bold text-foreground">{label}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              required
                ? "bg-accent/12 text-accent border border-accent/25"
                : "bg-accent-ink/6 text-muted border border-accent-ink/12"
            }`}
          >
            {required ? "必填 Required" : "選填 Optional"}
          </span>
        </div>
        {headerRight ? (
          <div className="flex flex-wrap items-center gap-1.5">{headerRight}</div>
        ) : null}
      </div>
      {hint ? (
        <p className="text-[11px] leading-relaxed text-muted">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}

// Clear horizontal divider between form sections in /app/life.
export function LifeFormSeparator() {
  return <hr className="border-t border-accent-ink/12" />;
}
