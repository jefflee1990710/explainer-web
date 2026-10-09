import { generateText } from "ai";
import { directorModel } from "@/service/director/model";
import {
  FRAME_PROMPT_BUDGET,
  IMAGE_PROMPT_MAX_CHARS,
} from "@/service/higgsfield/frame-prompts";

// Flare rejects prompts over this many characters. At the cap, shorten first.
export function framePromptNeedsShorten(prompt: string, maxChars = IMAGE_PROMPT_MAX_CHARS) {
  return prompt.length >= maxChars;
}

// Quoted spellings and titles must survive compression unchanged.
export function framePromptQuotes(prompt: string) {
  const quotes = new Set<string>();
  for (const match of prompt.matchAll(/"([^"\n]+)"|「([^」\n]+)」/g)) {
    const text = (match[1] || match[2] || "").trim();
    if (text) quotes.add(text);
  }
  return [...quotes];
}

// Section labels (`Scene:`, `COMPOSITION LOCK:`) are the prompt's structure.
export function framePromptSectionLabels(prompt: string) {
  const labels = new Set<string>();
  for (const match of prompt.matchAll(/(?:^|\n)([A-Za-z][^:\n]{0,48}):/g)) {
    const label = match[1].trim();
    if (label) labels.add(label);
  }
  if (prompt.includes("Aspect ratio")) labels.add("Aspect ratio");
  return [...labels];
}

export function validateShortenedFramePrompt(
  original: string,
  shortened: string,
  maxChars = IMAGE_PROMPT_MAX_CHARS,
): { ok: true } | { ok: false; error: string } {
  const next = shortened.trim();
  if (!next) return { ok: false, error: "產圖說明縮短失敗，請再試一次" };
  if (next.length >= maxChars) {
    return { ok: false, error: "產圖說明縮短後仍超過上限" };
  }
  const missingQuote = framePromptQuotes(original).find((quote) => !next.includes(quote));
  if (missingQuote) return { ok: false, error: "產圖說明縮短後遺失了必須原樣保留的文字" };
  const missingLabel = framePromptSectionLabels(original).find((label) => !next.includes(label));
  if (missingLabel) return { ok: false, error: "產圖說明縮短後遺失了段落結構" };
  return { ok: true };
}

function unwrapModelText(text: string) {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:\w+)?\s*\n([\s\S]*?)\n```$/);
  return (fence ? fence[1] : trimmed).trim();
}

// Compress prose only. Headings and quoted lines stay so the still still spells the same words.
export async function shortenFramePromptWithGemini(
  prompt: string,
  maxChars = FRAME_PROMPT_BUDGET,
) {
  const { text } = await generateText({
    model: directorModel(),
    system: [
      "You shorten an image-generation prompt.",
      `The result must be under ${maxChars} characters.`,
      "Keep every section label, including the words before each colon, and keep Aspect ratio.",
      "Keep every double-quoted string and every 「」 string exactly, character for character.",
      "Compress only the prose between those labels. Do not drop a section, do not add sections, and do not change the order.",
      "Return only the shortened prompt. No commentary and no code fence.",
    ].join("\n"),
    prompt,
  });
  return unwrapModelText(text);
}

// Under the cap, the prompt is sent unchanged. Over the cap, Gemini shortens it
// and the result is checked before any image request.
export async function ensureFramePromptFits(
  prompt: string,
  shorten?: (prompt: string) => Promise<string>,
  maxChars = IMAGE_PROMPT_MAX_CHARS,
) {
  if (!framePromptNeedsShorten(prompt, maxChars)) return prompt;
  const run = shorten ?? ((text: string) => shortenFramePromptWithGemini(text, maxChars));
  const shortened = unwrapModelText(await run(prompt));
  const check = validateShortenedFramePrompt(prompt, shortened, maxChars);
  if (!check.ok) throw new Error(check.error);
  return shortened;
}
