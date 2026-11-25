"use client";

// Key-value rows on a Setting card. Each key fills `{{key}}` in wired prompts.

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { SETTINGS_VAR_KEY, type SettingsVars } from "@/model/canvas-settings";
import { DIALOG_FIELD } from "@/app/app/canvas/scro-dialog-shell";
import { ComposedInput, ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";

type Row = { key: string; value: string };

const toRows = (vars: SettingsVars): Row[] => Object.entries(vars).map(([key, value]) => ({ key, value }));

// Only valid, non-duplicate keys are saved; the rest stay as local rows until fixed.
function toVars(rows: readonly Row[]): SettingsVars {
  const out: SettingsVars = {};
  for (const row of rows) {
    if (SETTINGS_VAR_KEY.test(row.key) && !Object.hasOwn(out, row.key)) out[row.key] = row.value;
  }
  return out;
}

export function SettingsVarsEditor({
  isZh,
  vars,
  onChange,
}: {
  isZh: boolean;
  vars: SettingsVars | undefined;
  onChange: (vars: SettingsVars) => void;
}) {
  const saved = vars ?? {};
  const savedJson = JSON.stringify(saved);
  const [rows, setRows] = useState<Row[]>(() => toRows(saved));
  const [syncedJson, setSyncedJson] = useState(savedJson);
  // Values changed elsewhere (undo, the assistant) replace the local rows.
  if (savedJson !== syncedJson && savedJson !== JSON.stringify(toVars(rows))) {
    setSyncedJson(savedJson);
    setRows(toRows(saved));
  }

  const commit = (next: Row[]) => {
    setRows(next);
    const nextVars = toVars(next);
    setSyncedJson(JSON.stringify(nextVars));
    onChange(nextVars);
  };
  return (
    <div className="flex flex-col gap-1.5 border-t border-white/6 pt-2.5">
      <div className="flex items-center justify-between text-[11px] text-white/55">
        <span>{isZh ? "變數（填入 prompt 的 {{key}}）" : "Variables (fill {{key}} in prompts)"}</span>
        <button
          type="button"
          onClick={() => commit([...rows, { key: "", value: "" }])}
          className="nodrag inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-[#c6f24b] transition hover:bg-white/8"
        >
          <Plus className="h-3 w-3" />
          {isZh ? "新增" : "Add"}
        </button>
      </div>

      {rows.map((row, index) => {
        const duplicate = rows.findIndex((r) => r.key === row.key) !== index;
        const invalid = row.key !== "" && (!SETTINGS_VAR_KEY.test(row.key) || duplicate);
        const setRow = (patch: Partial<Row>) => commit(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
        return (
          <div key={index} className="flex items-start gap-1">
            <ComposedInput
              value={row.key}
              onValue={(key) => setRow({ key: key.trim() })}
              placeholder="key"
              aria-invalid={invalid}
              title={invalid ? (isZh ? "只可用英文字母、數字同底線，且不可重複" : "Letters, digits, and _ only; no duplicates") : undefined}
              className={`${DIALOG_FIELD} w-[38%] shrink-0 font-mono ${invalid ? "!border-rose-400/70" : ""}`}
            />
            <ComposedTextarea
              value={row.value}
              rows={1}
              onValue={(value) => setRow({ value })}
              placeholder={isZh ? "值" : "value"}
              className={`${DIALOG_FIELD} nowheel min-w-0 flex-1 resize-y`}
            />
            <button
              type="button"
              onClick={() => commit(rows.filter((_, i) => i !== index))}
              title={isZh ? "刪除" : "Remove"}
              className="nodrag mt-1 shrink-0 cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
