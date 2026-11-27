"use client";

// Compact inputs for the timeline inspector, styled like the node card fields.

import type { ReactNode } from "react";

const INPUT =
  "nodrag w-full rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none";

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-white/50">{label}</span>
      {children}
    </label>
  );
}

export function NumField({
  label,
  value,
  min,
  max,
  step = 0.1,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <FieldRow label={label}>
      <input
        type="number"
        className={INPUT}
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => {
          if (e.target.value === "") return onChange(undefined);
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(Math.min(max ?? n, Math.max(min ?? n, n)));
        }}
      />
    </FieldRow>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <FieldRow label={label}>
      <select className={`${INPUT} cursor-pointer`} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldRow>
  );
}

export function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-white/80">
      <input type="checkbox" className="nodrag accent-[#c6f24b]" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  rows = 3,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldRow label={label}>
      <textarea
        className={`${INPUT} nowheel resize-none leading-relaxed`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldRow>
  );
}
