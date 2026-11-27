"use client";

// One Setting variable. Key, value, and remove stay inside the 280px card.

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { DIALOG_FIELD } from "@/app/app/canvas/scro-dialog-shell";
import { ComposedInput, ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";

// Wrapped values stay readable, then scroll inside the field instead of growing the card.
const MAX_VALUE_HEIGHT = 88;

// Dialog fields are w-full. min-w-0 stops the input's default size from
// pushing the value and the remove icon past the card's right edge.
const ROW_FIELD = `${DIALOG_FIELD} min-w-0 max-w-full`;

export function SettingsVarRow({
  isZh,
  name,
  value,
  invalid,
  onName,
  onValue,
  onRemove,
}: {
  isZh: boolean;
  name: string;
  value: string;
  invalid: boolean;
  onName: (key: string) => void;
  onValue: (value: string) => void;
  onRemove: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  // Grow the value to its text, capped so a long value scrolls inside the column.
  useEffect(() => {
    const el = rowRef.current?.querySelector("textarea");
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      // border-box height needs the border added, or the last line sits 2px outside the field.
      const borderY = el.offsetHeight - el.clientHeight;
      const needed = el.scrollHeight + borderY;
      const next = Math.min(Math.max(needed, 32), MAX_VALUE_HEIGHT);
      el.style.height = `${next}px`;
      el.style.overflowY = needed > MAX_VALUE_HEIGHT ? "auto" : "hidden";
    };
    fit();
    el.addEventListener("input", fit);
    return () => el.removeEventListener("input", fit);
  }, [value]);

  return (
    <div ref={rowRef} className="grid w-full min-w-0 grid-cols-[6.75rem_minmax(0,1fr)_1.75rem] items-start gap-1">
      <ComposedInput
        value={name}
        size={1}
        onValue={(key) => onName(key.trim())}
        placeholder="key"
        aria-label={isZh ? "變數名稱" : "Variable name"}
        aria-invalid={invalid}
        title={invalid ? (isZh ? "只可用英文字母、數字同底線，且不可重複" : "Letters, digits, and _ only; no duplicates") : undefined}
        className={`${ROW_FIELD} font-mono ${invalid ? "!border-rose-400/70" : ""}`}
      />
      <ComposedTextarea
        value={value}
        rows={1}
        cols={1}
        onValue={onValue}
        placeholder={isZh ? "值" : "value"}
        aria-label={isZh ? "變數值" : "Variable value"}
        className={`${ROW_FIELD} nowheel resize-none`}
      />
      <button
        type="button"
        onClick={onRemove}
        title={isZh ? "刪除" : "Remove"}
        aria-label={isZh ? "刪除" : "Remove"}
        className="nodrag mt-1 grid h-7 w-7 cursor-pointer place-items-center rounded-md text-white/40 transition hover:bg-white/8 hover:text-rose-400"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
