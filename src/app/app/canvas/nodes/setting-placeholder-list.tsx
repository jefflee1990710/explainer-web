"use client";

// `{{key}}` chips for the Setting wired into the text field being edited.

import type { SettingsVars } from "@/model/canvas-settings";
import { promptPlaceholder } from "@/service/canvas/core/settings/template";

export function SettingPlaceholderList({
  isZh,
  vars,
  onInsert,
}: {
  isZh: boolean;
  // Undefined when no Setting is connected.
  vars?: SettingsVars;
  onInsert: (token: string) => void;
}) {
  if (!vars) return null;
  const keys = Object.keys(vars);
  if (keys.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-[10px] font-medium text-white/50">{isZh ? "可用佔位符" : "Available placeholders"}</div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            title={vars[key]}
            onClick={() => onInsert(promptPlaceholder(key))}
            className="nodrag cursor-pointer rounded bg-[#c6f24b]/10 px-1.5 py-0.5 font-mono text-[11px] text-[#c6f24b]/90 transition hover:bg-[#c6f24b]/20"
          >
            {promptPlaceholder(key)}
          </button>
        ))}
      </div>
    </div>
  );
}
