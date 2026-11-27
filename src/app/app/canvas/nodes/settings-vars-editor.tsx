"use client";

// Key-value rows on a Setting card. Each key fills `{{key}}` in wired prompts.

import { useState } from "react";
import { Plus } from "lucide-react";
import { SETTINGS_VAR_KEY, type SettingsVars } from "@/model/canvas-settings";
import { SettingsVarRow } from "@/app/app/canvas/nodes/settings-var-row";

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
    <div className="flex min-w-0 flex-col gap-1.5 border-t border-white/6 pt-2.5">
      <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] text-white/55">
        <span className="min-w-0">{isZh ? "變數（填入 prompt 的 {{key}}）" : "Variables (fill {{key}} in prompts)"}</span>
        <button
          type="button"
          onClick={() => commit([...rows, { key: "", value: "" }])}
          className="nodrag inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-[#c6f24b] transition hover:bg-white/8"
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
          <SettingsVarRow
            key={index}
            isZh={isZh}
            name={row.key}
            value={row.value}
            invalid={invalid}
            onName={(key) => setRow({ key })}
            onValue={(value) => setRow({ value })}
            onRemove={() => commit(rows.filter((_, i) => i !== index))}
          />
        );
      })}
    </div>
  );
}
