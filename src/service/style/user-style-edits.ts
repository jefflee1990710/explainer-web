import {
  USER_STYLE_VISUAL_KEYS,
  type UserStyleFields,
  type UserStyleVisualKey,
} from "@/service/style/user-style-fields";

const CANVAS_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const FIELD_MAX = 2000;

export type UserStyleEdit = { field: string; content: string };

function isVisualKey(field: string): field is UserStyleVisualKey {
  return (USER_STYLE_VISUAL_KEYS as readonly string[]).includes(field);
}

// Applies visual-field edits to a copy of the draft; drops unknown keys and invalid colors.
export function applyUserStyleEdits(
  fields: UserStyleFields,
  edits: UserStyleEdit[],
): { ok: true; fields: UserStyleFields; changedFields: UserStyleVisualKey[] } | { ok: false; error: string } {
  const next: UserStyleFields = { ...fields };
  for (const edit of edits) {
    if (!isVisualKey(edit.field)) continue;
    if (edit.content.length > FIELD_MAX) continue;
    if (edit.field === "canvasColor" && !CANVAS_COLOR_RE.test(edit.content)) continue;
    next[edit.field] = edit.content;
  }
  const changedFields = USER_STYLE_VISUAL_KEYS.filter((key) => next[key] !== fields[key]);
  if (changedFields.length === 0) {
    return { ok: false, error: "AI 沒有修改任何欄位" };
  }
  return { ok: true, fields: next, changedFields: [...changedFields] };
}
