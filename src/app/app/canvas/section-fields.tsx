"use client";

// Start and length inputs for the 2–15s section a Swap / Teleport render uses.

import { DIALOG_FIELD, DIALOG_LABEL } from "./scro-dialog-shell";

type Props = {
  isZh: boolean;
  start: number;
  length: number;
  onChange: (next: { start: number; length: number }) => void;
};

export function SectionFields({ isZh, start, length, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <label className={DIALOG_LABEL}>
        {isZh ? "由第幾秒開始" : "Start (s)"}
        <input
          type="number"
          min={0}
          step={0.5}
          value={start}
          onChange={(e) => onChange({ start: Math.max(0, Number(e.target.value) || 0), length })}
          className={DIALOG_FIELD}
        />
      </label>
      <label className={DIALOG_LABEL}>
        {isZh ? "長度（2–15 秒）" : "Length (2–15s)"}
        <input
          type="number"
          min={2}
          max={15}
          value={length}
          onChange={(e) =>
            onChange({ start, length: Math.min(15, Math.max(2, Math.round(Number(e.target.value) || 6))) })
          }
          className={DIALOG_FIELD}
        />
      </label>
    </div>
  );
}
