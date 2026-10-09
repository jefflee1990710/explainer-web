import {
  PERFORMANCE_FIELDS,
  performanceKeyOf,
  type PerformanceField,
  type PerformanceSlots,
} from "@/model/director-performance";
import { PROFILE_KEYS, type DirectorProfile } from "@/model/director-profile";
import { PERFORMANCE_FIELD_MAX, parsePerformanceSlots } from "@/service/director/performance";
import { EXTRA_INSTRUCTIONS_MAX, PROFILE_FIELD_MAX, parseProfile } from "@/service/director/profile";

// Editable custom-director fields: 8 profile fields plus extra instructions.
export const DRAFT_FIELDS = [...PROFILE_KEYS, "extraInstructions"] as const;
export type BaseDraftField = (typeof DRAFT_FIELDS)[number];
// Performance slots ("performance.<key>") exist only on on-camera read directors.
export type DraftField = BaseDraftField | PerformanceField;
export type DirectorDraft = {
  customProfile: DirectorProfile;
  extraInstructions: string;
  customPerformance?: PerformanceSlots;
};

// One full-field replacement proposed by the AI.
export type DirectorEdit = { field: string; content: string };

// Fields this draft can edit. Performance fields only when the draft carries slots.
export function draftFields(draft: Pick<DirectorDraft, "customPerformance">): DraftField[] {
  return draft.customPerformance ? [...DRAFT_FIELDS, ...PERFORMANCE_FIELDS] : [...DRAFT_FIELDS];
}

function isBaseDraftField(field: string): field is BaseDraftField {
  return (DRAFT_FIELDS as readonly string[]).includes(field);
}

function fieldMax(field: DraftField) {
  if (field === "extraInstructions") return EXTRA_INSTRUCTIONS_MAX;
  return performanceKeyOf(field) ? PERFORMANCE_FIELD_MAX : PROFILE_FIELD_MAX;
}

export function draftFieldValue(draft: DirectorDraft, field: DraftField): string {
  if (field === "extraInstructions") return draft.extraInstructions;
  const perfKey = performanceKeyOf(field);
  if (perfKey) return draft.customPerformance?.[perfKey] ?? "";
  return draft.customProfile[field as BaseDraftField & keyof DirectorProfile];
}

// Applies field edits to a copy of the draft; rejects unknown fields and over-long content.
export function applyDirectorEdits(
  draft: DirectorDraft,
  edits: DirectorEdit[],
): { ok: true; draft: DirectorDraft; changedFields: DraftField[] } | { ok: false; error: string } {
  const next: DirectorDraft = {
    customProfile: { ...draft.customProfile },
    extraInstructions: draft.extraInstructions,
    ...(draft.customPerformance ? { customPerformance: { ...draft.customPerformance } } : {}),
  };
  for (const edit of edits) {
    const perfKey = performanceKeyOf(edit.field);
    if (perfKey) {
      if (!next.customPerformance) return { ok: false, error: "AI 修改了不存在的欄位" };
      if (edit.content.length > PERFORMANCE_FIELD_MAX) return { ok: false, error: "欄位內容過長" };
      next.customPerformance[perfKey] = edit.content;
      continue;
    }
    if (!isBaseDraftField(edit.field)) return { ok: false, error: "AI 修改了不存在的欄位" };
    if (edit.content.length > fieldMax(edit.field)) return { ok: false, error: "欄位內容過長" };
    if (edit.field === "extraInstructions") next.extraInstructions = edit.content;
    else next.customProfile[edit.field] = edit.content;
  }
  return { ok: true, draft: next, changedFields: changedDraftFields(draft, next) };
}

// Fields whose value differs between the saved draft and the working draft.
export function changedDraftFields(saved: DirectorDraft, draft: DirectorDraft): DraftField[] {
  const fields = draftFields({ customPerformance: draft.customPerformance ?? saved.customPerformance });
  return fields.filter((field) => draftFieldValue(saved, field) !== draftFieldValue(draft, field));
}

// Untrusted client draft → typed draft within limits. customPerformance stays absent when not sent.
export function parseDraft(raw: unknown): { ok: true; draft: DirectorDraft } | { ok: false; error: string } {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const profile = parseProfile(source.customProfile);
  if (!profile.ok) return profile;
  const extra = source.extraInstructions;
  const extraInstructions = extra === undefined || extra === null ? "" : String(extra);
  if (extraInstructions.length > EXTRA_INSTRUCTIONS_MAX) return { ok: false, error: "欄位內容過長" };
  const draft: DirectorDraft = { customProfile: profile.profile, extraInstructions };
  if (source.customPerformance !== undefined && source.customPerformance !== null) {
    const perf = parsePerformanceSlots(source.customPerformance);
    if (!perf.ok) return perf;
    draft.customPerformance = perf.slots;
  }
  return { ok: true, draft };
}
