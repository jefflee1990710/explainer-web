"use client";

// Swap / Teleport Settings tiles in the canvas Tools tab. Click or drag one onto the canvas to add a settings node.

import { SlidersHorizontal } from "lucide-react";
import { settingsKindDef } from "@/service/canvas/settings/registry";

export const CANVAS_DRAG_SETTINGS_MIME = "application/x-scro-canvas-settings";
export const HAND_ADDED_SETTINGS_KINDS = ["swap", "teleport"] as const;
export type HandAddedSettingsKind = (typeof HAND_ADDED_SETTINGS_KINDS)[number];

export function isHandAddedSettingsKind(value: string): value is HandAddedSettingsKind {
  return (HAND_ADDED_SETTINGS_KINDS as readonly string[]).includes(value);
}

export function CanvasSettingsTool({
  isZh,
  kind,
  onAdd,
}: {
  isZh: boolean;
  kind: HandAddedSettingsKind;
  onAdd: (kind: HandAddedSettingsKind) => void;
}) {
  const def = settingsKindDef(kind);
  const label = isZh ? def.label.zh : def.label.en;
  return (
    <div
      draggable
      title={label}
      onDragStart={(event) => {
        event.dataTransfer.setData(CANVAS_DRAG_SETTINGS_MIME, kind);
        event.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onAdd(kind)}
      className="group flex cursor-grab flex-col items-center gap-1.5 rounded-[10px] border border-white/8 bg-[#131823]/90 px-1 py-2 text-center transition hover:border-[#c6f24b]/50 hover:bg-[#171d2a] active:cursor-grabbing"
    >
      <span
        className="grid h-8 w-8 place-items-center rounded-lg"
        style={{ backgroundColor: `${def.color}1f`, color: def.color }}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </span>
      <span className="line-clamp-2 w-full text-[10px] leading-3 font-semibold text-white/90">{label}</span>
    </div>
  );
}

// Settings tiles follow the Prompt tile: hidden by a category chip, filtered by the search text.
export function canvasSettingsToolVisible(kind: HandAddedSettingsKind, query: string, categoryFiltered: boolean): boolean {
  if (categoryFiltered) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const def = settingsKindDef(kind);
  return [def.label.zh, def.label.en, "settings", "設定"].some((label) => label.toLowerCase().includes(q));
}
