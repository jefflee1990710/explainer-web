import type { StyleChatMessage } from "@/model/user-style";
import {
  USER_STYLE_VISUAL_KEYS,
  type UserStyleFields,
} from "@/service/style/user-style-fields";

// Instructions for the model that edits a custom style's visual draft.
export function userStyleChatSystemPrompt(): string {
  return `You are editing the visual style for an explainer video still. These fields control canvas, look, palette, typography, motion, negatives, and on-canvas lettering.

Visual fields: ${USER_STYLE_VISUAL_KEYS.join(", ")}.

Rules:
- Replace only the visual fields listed above. Do not edit name or description; the user renames the style by hand.
- Change only what the user asks for. Leave every other field untouched.
- Write plain text, short and concrete. Each field stays under 2000 characters.
- Return each changed field with its full new content in edits, using the exact field key. Do not include unchanged fields.
- Return JSON with summary and edits: { summary, edits: { field, content }[] }.
- summary: one short sentence describing what you changed, written in the same language as the user's request.`;
}

// Current visual fields, recent chat history, then the user's new request.
export function userStyleChatUserPrompt(input: {
  fields: UserStyleFields;
  history: StyleChatMessage[];
  message: string;
}): string {
  const fieldBlocks = USER_STYLE_VISUAL_KEYS.map(
    (key) => `### FIELD: ${key}\n${input.fields[key].trim() || "(empty)"}`,
  ).join("\n\n");
  const history = input.history.length
    ? input.history
        .map((item) => {
          const changed = item.changedPaths?.length ? ` (changed: ${item.changedPaths.join(", ")})` : "";
          return `${item.role}: ${item.content}${changed}`;
        })
        .join("\n")
    : "(none)";
  return `Current style fields:\n\n${fieldBlocks}\n\nRecent conversation:\n${history}\n\nUser request:\n${input.message}`;
}
