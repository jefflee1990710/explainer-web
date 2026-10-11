import type { TextStyleChatMessage } from "@/model/text-style";

// Instructions for the model that edits a custom text style's lookLine.
export function textStyleChatSystemPrompt(): string {
  return `You are editing the lettering look for explainer-video subtitles.

You may only change the lookLine field: one short "Look: …" sentence that describes weight, colour, texture, edges, and field — never placement, never a scene, never people.

Rules:
- Change only what the user asks for.
- Keep lookLine under 2000 characters. Prefer one dense sentence starting with "Look:".
- Do not invent subtitle placement, safe zones, or camera notes.
- If a reference image is attached, infer lettering appearance from it.
- Return JSON: { summary, lookLine }.
- summary: one short sentence in the same language as the user's request describing what you changed.
- Always return the full new lookLine, even when unchanged.`;
}

// Current lookLine, recent chat, then the user's request.
export function textStyleChatUserPrompt(input: {
  lookLine: string;
  history: TextStyleChatMessage[];
  message: string;
  hasImage?: boolean;
}): string {
  const history = input.history.length
    ? input.history
        .map((item) => {
          const image = item.imageUrl ? " (image attached)" : "";
          return `${item.role}: ${item.content}${image}`;
        })
        .join("\n")
    : "(none)";
  const imageNote = input.hasImage
    ? "\nA reference image is attached. Infer lettering details from it.\n"
    : "";
  return `Current lookLine:\n${input.lookLine.trim() || "(empty)"}\n\nRecent conversation:\n${history}\n${imageNote}\nUser request:\n${input.message}`;
}
