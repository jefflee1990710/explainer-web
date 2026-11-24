"use client";

// Setting tile in the canvas Tools tab. Click or drag it onto the canvas to add a Setting node.

import { CanvasAddButton } from "@/app/app/canvas/canvas-add-button";
import { SlidersHorizontal } from "lucide-react";
import { SETTING_COLOR } from "@/app/app/canvas/nodes/settings-node-card";

export const CANVAS_DRAG_SETTINGS_MIME = "application/x-scro-canvas-settings";

export function CanvasSettingsTool({
  isZh,
  selected = false,
  addLabel,
  onSelect,
  onAdd,
}: {
  isZh: boolean;
  selected?: boolean;
  addLabel: string;
  onSelect: () => void;
  onAdd: () => void;
}) {
  const label = isZh ? "設定" : "Setting";
  return (
    <div
      draggable
      title={label}
      onDragStart={(event) => {
        event.dataTransfer.setData(CANVAS_DRAG_SETTINGS_MIME, "setting");
        event.dataTransfer.effectAllowed = "copy";
      }}
      data-canvas-pick=""
      onClick={onSelect}
      className={`group relative flex cursor-grab flex-col items-center gap-1.5 rounded-[10px] border bg-[#131823]/90 px-1 py-2 text-center transition hover:border-[#c6f24b]/50 hover:bg-[#171d2a] active:cursor-grabbing ${
        selected ? "border-[#c6f24b]" : "border-white/8"
      }`}
    >
      {selected ? <CanvasAddButton label={addLabel} onAdd={onAdd} /> : null}
      <span
        className="grid h-8 w-8 place-items-center rounded-lg"
        style={{ backgroundColor: `${SETTING_COLOR}1f`, color: SETTING_COLOR }}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </span>
      <span className="line-clamp-2 w-full text-[10px] leading-3 font-semibold text-white/90">{label}</span>
    </div>
  );
}

// The Setting tile follows the Prompt tile: hidden by a category chip, filtered by the search text.
export function canvasSettingsToolVisible(query: string, categoryFiltered: boolean): boolean {
  if (categoryFiltered) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return ["setting", "settings", "設定", "variable", "變數"].some((label) => label.includes(q) || q.includes(label));
}
