import { LETTERING_KEYS } from "@/service/style/lettering";
import type { Style } from "@/service/style/types";

/** Prompt keys on Style except `id`. */
export const USER_STYLE_PROMPT_KEYS = [
  "name",
  "description",
  "canvas",
  "canvasColor",
  "look",
  "palette",
  "typography",
  "motion",
  "negatives",
] as const;

export type UserStylePromptKey = (typeof USER_STYLE_PROMPT_KEYS)[number];

export const USER_STYLE_LETTERING_KEYS = LETTERING_KEYS;

export type UserStyleLetteringKey = (typeof USER_STYLE_LETTERING_KEYS)[number];

/** Visual fields editable by AI chat (prompt minus meta, plus lettering). */
export const USER_STYLE_VISUAL_KEYS = [
  "canvas",
  "canvasColor",
  "look",
  "palette",
  "typography",
  "motion",
  "negatives",
  ...LETTERING_KEYS,
] as const;

export type UserStyleVisualKey = (typeof USER_STYLE_VISUAL_KEYS)[number];

export type UserStyleFields = Pick<Style, UserStylePromptKey> &
  Record<UserStyleLetteringKey, string>;

const CANVAS_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const FIELD_MAX = 2000;
const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;

function letteringValue(style: Style, key: UserStyleLetteringKey): string {
  return style[key] ?? "";
}

/** Copies prompt and lettering fields from a system style into a plain snapshot. */
export function copyUserStyleFields(style: Style): UserStyleFields {
  const next = {} as UserStyleFields;
  for (const key of USER_STYLE_PROMPT_KEYS) {
    next[key] = style[key];
  }
  for (const key of USER_STYLE_LETTERING_KEYS) {
    next[key] = letteringValue(style, key);
  }
  return next;
}

export function parseUserStyleMeta(
  name: string,
  description: string,
): { ok: true; name: string; description: string } | { ok: false; error: string } {
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  if (trimmedName.length < 1 || trimmedName.length > NAME_MAX) {
    return { ok: false, error: "invalid name" };
  }
  if (trimmedDescription.length > DESCRIPTION_MAX) {
    return { ok: false, error: "invalid description" };
  }
  return { ok: true, name: trimmedName, description: trimmedDescription };
}

function parseStringField(
  raw: Record<string, unknown>,
  key: string,
  max: number,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw[key];
  if (typeof value !== "string") {
    return { ok: false, error: `invalid ${key}` };
  }
  if (value.length > max) {
    return { ok: false, error: `${key} too long` };
  }
  return { ok: true, value };
}

export function parseUserStyleFields(
  raw: unknown,
): { ok: true; fields: UserStyleFields } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "invalid fields" };
  }
  const record = raw as Record<string, unknown>;
  const fields = {} as UserStyleFields;

  for (const key of USER_STYLE_PROMPT_KEYS) {
    const parsed = parseStringField(record, key, FIELD_MAX);
    if (!parsed.ok) return parsed;
    fields[key] = parsed.value;
  }

  if (!CANVAS_COLOR_RE.test(fields.canvasColor)) {
    return { ok: false, error: "invalid canvasColor" };
  }

  for (const key of USER_STYLE_LETTERING_KEYS) {
    const value = record[key];
    if (value === undefined || value === null) {
      fields[key] = "";
      continue;
    }
    if (typeof value !== "string") {
      return { ok: false, error: `invalid ${key}` };
    }
    if (value.length > FIELD_MAX) {
      return { ok: false, error: `${key} too long` };
    }
    fields[key] = value;
  }

  return { ok: true, fields };
}
