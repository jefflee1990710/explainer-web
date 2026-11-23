// Settings node kinds and helpers to read or write each kind's data.

import type { CanvasSettingsData, CanvasSettingsKind } from "@/model/canvas-settings";
import { explainerSettingsKind } from "@/service/canvas/settings/explainer";
import { swapSettingsKind } from "@/service/canvas/settings/swap";
import { teleportSettingsKind } from "@/service/canvas/settings/teleport";
import type {
  SettingsKindDef,
  SettingsPatch,
  SettingsResolveContext,
  SettingsTarget,
} from "@/service/canvas/settings/types";

export { explainerSettingsOf, explainerSettingsPatch } from "@/service/canvas/settings/explainer-data";

const KINDS = {
  explainer: explainerSettingsKind,
  swap: swapSettingsKind,
  teleport: teleportSettingsKind,
} as const;

export const SETTINGS_KINDS = Object.values(KINDS) as unknown as readonly SettingsKindDef[];

export function settingsKindDef(kind: CanvasSettingsKind): SettingsKindDef {
  return KINDS[kind] as unknown as SettingsKindDef;
}

export function settingsAccepts(settings: CanvasSettingsData, target: SettingsTarget): boolean {
  return settingsKindDef(settings.kind).accepts(target);
}

// Whether a model node shows a settings handle at all.
export function acceptsAnySettings(target: SettingsTarget): boolean {
  return SETTINGS_KINDS.some((def) => def.accepts(target));
}

export function resolveSettings(
  settings: CanvasSettingsData,
  target: SettingsTarget,
  ctx: SettingsResolveContext,
): SettingsPatch {
  const def = settingsKindDef(settings.kind);
  return def.accepts(target) ? def.resolve(settings as never, target, ctx) : {};
}

export function settingsChangedKeys(a: CanvasSettingsData, b: CanvasSettingsData): string[] {
  if (a.kind !== b.kind) return ["kind"];
  return settingsKindDef(a.kind).changed(a as never, b as never);
}

export function defaultSettings(kind: "swap" | "teleport"): CanvasSettingsData {
  return KINDS[kind].defaults!();
}
