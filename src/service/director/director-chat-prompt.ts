import type { DirectorChatMessage } from "@/model/skill";
import { SKILL_PATH, type DirectorDraft } from "@/service/director/director-edits";

// Instructions for the model that edits a custom director's markdown files.
export function directorChatSystemPrompt(): string {
  return `You are editing a video director skill for an explainer video generator. The skill is a set of markdown files:
- ${SKILL_PATH} is the main director prompt.
- Reference files ending in prompt-contract.md feed Phase B (per-clip video prompt rules).
- examples.md is never sent to the director; it is only documentation that SKILL.md may cite.
- Every other reference file feeds Phase A (hooks, proposal and storyboard contract).

Rules:
- Change only what the user asks for. Leave every other rule, section, and wording untouched.
- Keep the existing markdown structure (headings, lists, tables, code fences).
- Only edit files listed in the request, using their exact paths. Never invent new files.
- For each file you change, return its full new content in edits. Do not include unchanged files.
- summary: one or two short sentences describing what you changed, written in the same language as the user's request.`;
}

// Every draft file, SKILL.md first.
function draftFiles(draft: DirectorDraft): Array<{ path: string; content: string }> {
  return [{ path: SKILL_PATH, content: draft.systemPrompt }, ...draft.references];
}

// Current draft files, recent chat history, then the user's new request.
export function directorChatUserPrompt(input: {
  draft: DirectorDraft;
  history: DirectorChatMessage[];
  message: string;
}): string {
  const files = draftFiles(input.draft)
    .map((file) => `### FILE: ${file.path}\n\`\`\`\`markdown\n${file.content}\n\`\`\`\``)
    .join("\n\n");
  const history = input.history.length
    ? input.history
        .map((item) => {
          const changed = item.changedPaths?.length ? ` (changed: ${item.changedPaths.join(", ")})` : "";
          return `${item.role}: ${item.content}${changed}`;
        })
        .join("\n")
    : "(none)";
  return `Current director files:\n\n${files}\n\nRecent conversation:\n${history}\n\nUser request:\n${input.message}`;
}
