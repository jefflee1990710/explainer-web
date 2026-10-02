import { PROFILE_KEYS, type DirectorProfile } from "@/model/skill";
import { EXTRA_INSTRUCTIONS_MAX, PROFILE_FIELD_MAX, parseProfile } from "@/service/director/profile";

// Editable custom-director fields: 8 profile fields plus extra instructions.
export const DRAFT_FIELDS = [...PROFILE_KEYS, "extraInstructions"] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];
export type DirectorDraft = { customProfile: DirectorProfile; extraInstructions: string };

// One full-field replacement proposed by the AI.
export type DirectorEdit = { field: string; content: string };

function isDraftField(field: string): field is DraftField {
  return (DRAFT_FIELDS as readonly string[]).includes(field);
}

function fieldMax(field: DraftField) {
  return field === "extraInstructions" ? EXTRA_INSTRUCTIONS_MAX : PROFILE_FIELD_MAX;
}

export function draftFieldValue(draft: DirectorDraft, field: DraftField): string {
  return field === "extraInstructions" ? draft.extraInstructions : draft.customProfile[field];
}

// Applies field edits to a copy of the draft; rejects unknown fields and over-long content.
export function applyDirectorEdits(
  draft: DirectorDraft,
  edits: DirectorEdit[],
): { ok: true; draft: DirectorDraft; changedFields: DraftField[] } | { ok: false; error: string } {
  const next: DirectorDraft = { customProfile: { ...draft.customProfile }, extraInstructions: draft.extraInstructions };
  for (const edit of edits) {
    if (!isDraftField(edit.field)) return { ok: false, error: "AI 修改了不存在的欄位" };
    if (edit.content.length > fieldMax(edit.field)) return { ok: false, error: "欄位內容過長" };
    if (edit.field === "extraInstructions") next.extraInstructions = edit.content;
    else next.customProfile[edit.field] = edit.content;
  }
  return { ok: true, draft: next, changedFields: changedDraftFields(draft, next) };
}

// Fields whose value differs between the saved draft and the working draft.
export function changedDraftFields(saved: DirectorDraft, draft: DirectorDraft): DraftField[] {
  return DRAFT_FIELDS.filter((field) => draftFieldValue(saved, field) !== draftFieldValue(draft, field));
}

// Untrusted client draft → typed draft within limits.
export function parseDraft(raw: unknown): { ok: true; draft: DirectorDraft } | { ok: false; error: string } {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const profile = parseProfile(source.customProfile);
  if (!profile.ok) return profile;
  const extra = source.extraInstructions;
  const extraInstructions = extra === undefined || extra === null ? "" : String(extra);
  if (extraInstructions.length > EXTRA_INSTRUCTIONS_MAX) return { ok: false, error: "欄位內容過長" };
  return { ok: true, draft: { customProfile: profile.profile, extraInstructions } };
}
