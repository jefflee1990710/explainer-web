import type { SkillReference } from "@/model/skill";

// Editable director files: SKILL.md body plus reference markdown files.
export type DirectorDraft = { systemPrompt: string; references: SkillReference[] };

// One full-file replacement proposed by the AI.
export type DirectorEdit = { path: string; content: string };

export const SKILL_PATH = "SKILL.md";

// Max characters allowed in a single director file.
export const DIRECTOR_FILE_MAX = 60_000;

// All file paths in a draft, SKILL.md first.
export function draftPaths(draft: DirectorDraft): string[] {
  return [SKILL_PATH, ...draft.references.map((r) => r.path)];
}

// Content of one file in a draft, or undefined when the path does not exist.
function fileContent(draft: DirectorDraft, path: string): string | undefined {
  if (path === SKILL_PATH) return draft.systemPrompt;
  return draft.references.find((r) => r.path === path)?.content;
}

// Applies full-file edits to a copy of the draft; rejects unknown paths and oversized files.
export function applyDirectorEdits(
  draft: DirectorDraft,
  edits: DirectorEdit[],
): { ok: true; draft: DirectorDraft; changedPaths: string[] } | { ok: false; error: string } {
  const known = new Set(draftPaths(draft));
  // Later edits to the same path overwrite earlier ones.
  const byPath = new Map<string, string>();
  for (const edit of edits) {
    if (!known.has(edit.path)) return { ok: false, error: "AI 修改了不存在的檔案" };
    if (edit.content.length > DIRECTOR_FILE_MAX) return { ok: false, error: "檔案內容過長" };
    byPath.set(edit.path, edit.content);
  }

  const next: DirectorDraft = {
    systemPrompt: byPath.get(SKILL_PATH) ?? draft.systemPrompt,
    references: draft.references.map((r) => ({ path: r.path, content: byPath.get(r.path) ?? r.content })),
  };
  return { ok: true, draft: next, changedPaths: changedDraftPaths(draft, next) };
}

// Paths whose content differs between the saved draft and the working draft.
export function changedDraftPaths(saved: DirectorDraft, draft: DirectorDraft): string[] {
  return draftPaths(draft).filter((path) => fileContent(saved, path) !== fileContent(draft, path));
}
