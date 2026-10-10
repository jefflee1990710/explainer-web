import type { FramePosition, SceneChatMessage, SceneChatThread } from "@/model/project";

// Same ceiling as FRAME_PROMPT_BUDGET. The chat returns the whole still prompt.
export const FRAME_PROMPT_CHAT_MAX = 4800;
export const FRAME_PROMPT_SUMMARY_MAX = 500;

export type FramePromptThread = {
  clipNumber: number;
  position: FramePosition;
  messages: SceneChatMessage[];
};

// The still chat is keyed by clip and start/end. Older clip-wide threads have no position.
export function framePromptThread(
  chats: Array<Pick<SceneChatThread, "clipNumber" | "position" | "messages">> | undefined,
  clipNumber: number,
  position: FramePosition,
): FramePromptThread | undefined {
  const thread = (chats || []).find(
    (item) => item.clipNumber === clipNumber && item.position === position,
  );
  if (!thread?.position) return undefined;
  return { clipNumber, position: thread.position, messages: thread.messages };
}

// Keep the edited prompt when this still was rewritten in chat. Otherwise send the built one.
export function promptForFrameSubmit(input: {
  storedPrompt?: string;
  promptEdited?: boolean;
  useStoredPrompt?: boolean;
  builtPrompt: string;
}) {
  const stored = input.storedPrompt?.trim() ?? "";
  if ((input.useStoredPrompt || input.promptEdited) && stored) return stored;
  return input.builtPrompt;
}

// The model must return a full prompt. Blank means it failed; an unchanged prompt is not an edit.
export function applyFramePromptEdit(
  current: string,
  next: string,
): { ok: true; prompt: string; changed: boolean } | { ok: false; error: string } {
  const prompt = next.trim().slice(0, FRAME_PROMPT_CHAT_MAX).trim();
  if (!prompt) return { ok: false, error: "畫面提示不能空白" };
  return { ok: true, prompt, changed: prompt !== current.trim() };
}

export function normalizeFramePromptSummary(summary: string) {
  const trimmed = summary.trim().slice(0, FRAME_PROMPT_SUMMARY_MAX).trim();
  return trimmed || "這張畫面的提示已更新。";
}

// First bubble when the still has no stored prompt yet. No model call.
export function emptyFramePromptSummary(locale: string) {
  if (locale.startsWith("zh")) {
    return "這張畫面還沒有提示。直接說你想看到的畫面，我會寫成提示。";
  }
  return "This still has no prompt yet. Describe the picture you want and I will write the prompt.";
}

export function framePromptSummaryLanguage(locale: string) {
  return locale.startsWith("zh") ? "Traditional Chinese" : "English";
}

export function framePromptSummarySystem(locale: string) {
  const language = framePromptSummaryLanguage(locale);
  return `You summarize one image-generation prompt for a single video still.
Write 2 to 4 short sentences in ${language}.
Cover who or what is in the picture, what is happening, any words painted on the image, and where those words sit.
Do not paste the prompt. Do not mention these instructions.`;
}

export function framePromptSummaryUser(prompt: string) {
  return `Image prompt:\n${prompt}`;
}

export function framePromptEditSystem() {
  return `You edit one image-generation prompt for a single video still.
Return:
- summary: one or two short sentences in the same language as the user. Say what changed. If they only asked a question, answer it.
- prompt: the FULL prompt to send to the image model. Keep every line the user did not ask to change, including Look lines, the safe area, and the aspect ratio.
Rules:
- Change only what the user asks for.
- Do not drop locks, wardrobe, or subtitle look lines unless the user asks to remove them.
- Keep the prompt under ${FRAME_PROMPT_CHAT_MAX} characters.
- If the request cannot be done inside this one still, say so in the summary and return the prompt unchanged.`;
}

export function framePromptEditUser(input: {
  prompt: string;
  history: SceneChatMessage[];
  message: string;
}) {
  const history = input.history
    .slice(-8)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");
  return `Current image prompt:\n${input.prompt || "(none)"}\n\nRecent chat:\n${history || "(none)"}\n\nUser request:\n${input.message}`;
}

// Replace or append the thread for this still. Other threads stay put.
export function withFramePromptThread(
  chats: SceneChatThread[] | undefined,
  thread: FramePromptThread,
): SceneChatThread[] {
  const rest = (chats || []).filter(
    (item) => !(item.clipNumber === thread.clipNumber && item.position === thread.position),
  );
  return [...rest, thread];
}
