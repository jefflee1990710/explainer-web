import { generateText, Output } from "ai";
import { z } from "zod";
import type { StoryboardClipDraft, VoLanguage } from "@/model/project";
import { storyboardModel, storyboardProviderOptions } from "@/service/director/model";
import { persistBuffer } from "@/service/higgsfield/persist";

export const MAX_CLIP_DRAFTS = 12;
export const MAX_DRAFT_EXPLANATION_LENGTH = 800;
export const MAX_DRAFT_VO_LENGTH = 400;

export type StoryboardDraftChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const draftChatOutputSchema = z.object({
  reply: z
    .string()
    .describe(
      "Short, helpful reply in the user's language (Traditional Chinese / Cantonese or English) summarizing the drafted or updated clips.",
    ),
  clips: z
    .array(
      z.object({
        clipNumber: z.number().int().min(1).max(MAX_CLIP_DRAFTS),
        explanation: z
          .string()
          .describe(
            "Concrete visual & explanation staging for this clip: what appears on screen, how the concept is explained visually, layout, and action.",
          ),
        voDraft: z
          .string()
          .optional()
          .describe("Suggested voiceover or spoken dialogue line for this clip."),
      }),
    )
    .min(1)
    .max(MAX_CLIP_DRAFTS),
});

// Sanitize and normalize user/client clip drafts, keeping only rows with a sketch, explanation, or VO.
export function sanitizeClipDraftsInput(raw: unknown): StoryboardClipDraft[] {
  if (!Array.isArray(raw)) return [];
  const drafts: StoryboardClipDraft[] = [];
  for (let i = 0; i < raw.length && drafts.length < MAX_CLIP_DRAFTS; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const explanation = String(record.explanation ?? "")
      .trim()
      .slice(0, MAX_DRAFT_EXPLANATION_LENGTH);
    const voDraft = String(record.voDraft ?? "")
      .trim()
      .slice(0, MAX_DRAFT_VO_LENGTH);
    const sketchUrl = String(record.sketchUrl ?? "").trim();
    if (!explanation && !voDraft && !sketchUrl) continue;
    const rawNum = Number(record.clipNumber);
    const clipNumber =
      Number.isInteger(rawNum) && rawNum >= 1 ? rawNum : drafts.length + 1;
    drafts.push({
      clipNumber,
      explanation,
      ...(voDraft ? { voDraft } : {}),
      ...(sketchUrl ? { sketchUrl } : {}),
    });
  }
  return drafts.map((draft, index) => ({
    ...draft,
    clipNumber: index + 1,
  }));
}

// Upload any inline PNG data: URLs in clipDrafts to Vercel Blob so MongoDB only stores clean HTTPS URLs.
export async function uploadClipDraftSketches(
  clerkUserId: string,
  drafts: StoryboardClipDraft[],
): Promise<StoryboardClipDraft[]> {
  const out: StoryboardClipDraft[] = [];
  const safeUser = clerkUserId.replace(/[^a-zA-Z0-9_-]/g, "");
  for (const draft of drafts) {
    let sketchUrl = draft.sketchUrl;
    if (sketchUrl && sketchUrl.startsWith("data:image/")) {
      const match = sketchUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], "base64");
        if (buffer.byteLength > 0 && buffer.byteLength <= 6 * 1024 * 1024) {
          sketchUrl = await persistBuffer(
            buffer,
            `explainer/brands/${safeUser}/draft-sketch-${Date.now()}-clip-${draft.clipNumber}.png`,
            mime,
          );
        } else {
          sketchUrl = undefined;
        }
      } else {
        sketchUrl = undefined;
      }
    }
    out.push({
      clipNumber: draft.clipNumber,
      explanation: draft.explanation,
      ...(draft.voDraft ? { voDraft: draft.voDraft } : {}),
      ...(sketchUrl && /^https?:\/\//i.test(sketchUrl) ? { sketchUrl } : {}),
    });
  }
  return out;
}

// Formats the user's pre-planned clip drafts into instructions for the Phase A AI Director.
export function buildStoryboardDraftPhaseABlock(
  drafts: StoryboardClipDraft[] | undefined,
): string {
  if (!drafts || drafts.length === 0) return "";
  const lines = drafts.map((draft) => {
    const parts = [`- Clip ${draft.clipNumber}:`];
    if (draft.explanation.trim()) {
      parts.push(`  Visual & Scene Explanation: ${draft.explanation.trim()}`);
    }
    if (draft.voDraft?.trim()) {
      parts.push(`  Suggested VO / Dialogue: ${draft.voDraft.trim()}`);
    }
    if (draft.sketchUrl) {
      parts.push(
        `  Layout Sketch: Attached as [Clip ${draft.clipNumber} Hand-Drawn Sketch] — follow its spatial layout, diagram placement, and staging.`,
      );
    }
    return parts.join("\n");
  });
  return [
    "\nUser Storyboard Clip Drafts (the user pre-designed these specific clips in the storyboard draft step; you MUST incorporate their visual explanations, VO drafts, and any attached hand-drawn layout sketches for the corresponding clips):",
    ...lines,
    "",
  ].join("\n");
}

// Merge AI-generated clip drafts with existing user sketches so drawings are never lost on chat updates.
export function mergeAiDraftsWithExistingSketches(
  aiClips: Array<{ clipNumber: number; explanation: string; voDraft?: string }>,
  existing: StoryboardClipDraft[],
): StoryboardClipDraft[] {
  const sketchByClip = new Map<number, string>();
  for (const item of existing) {
    if (item.sketchUrl) sketchByClip.set(item.clipNumber, item.sketchUrl);
  }
  return aiClips.slice(0, MAX_CLIP_DRAFTS).map((clip, index) => {
    const clipNumber = index + 1;
    const sketchUrl = sketchByClip.get(clip.clipNumber) ?? sketchByClip.get(clipNumber);
    const explanation = clip.explanation.trim().slice(0, MAX_DRAFT_EXPLANATION_LENGTH);
    const voDraft = clip.voDraft?.trim().slice(0, MAX_DRAFT_VO_LENGTH);
    return {
      clipNumber,
      explanation,
      ...(voDraft ? { voDraft } : {}),
      ...(sketchUrl ? { sketchUrl } : {}),
    };
  });
}

// Runs the AI Storyboard Draft Assistant chat to draft or refine pre-Phase-A clip breakdowns.
export async function draftStoryboardClipsWithAi(input: {
  skillSlug: string;
  styleId: string;
  source: string;
  spokenScript?: string;
  language?: VoLanguage;
  currentDrafts: StoryboardClipDraft[];
  history: StoryboardDraftChatMessage[];
  message: string;
}): Promise<{ reply: string; drafts: StoryboardClipDraft[] }> {
  const currentText =
    input.currentDrafts.length > 0
      ? input.currentDrafts
          .map(
            (d) =>
              `Clip ${d.clipNumber}:\n  Explanation: ${d.explanation || "(empty)"}\n  VO: ${d.voDraft || "(empty)"}${d.sketchUrl ? "\n  (User has drawn a layout sketch on the canvas for this clip)" : ""}`,
          )
          .join("\n\n")
      : "(No clip drafts yet — create a complete set of clips from the script)";

  const historyText =
    input.history.length > 0
      ? input.history
          .slice(-6)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")
      : "(none)";

  const generated = await generateText({
    model: storyboardModel(),
    providerOptions: storyboardProviderOptions(),
    output: Output.object({ schema: draftChatOutputSchema }),
    system: `You are an expert AI Storyboard Draft Assistant helping a creator plan clip-by-clip visual explanations and voiceover lines before full storyboard generation.
Director mode: ${input.skillSlug || "cartoon-explainer-video-director"}
Visual style: ${input.styleId || "realistic"}
Target language: ${input.language || "yue"}

Rules:
- Read the user's main script/instruction and their chat request.
- Output the full list of drafted clips (usually 3 to 6 clips unless the user asks for a specific number) in sequential order (Clip 1, Clip 2, ...).
- For each clip, write a clear, concrete "explanation" describing what happens visually on screen (how the concept is explained, composition, props/diagrams, character action) and a "voDraft" (the spoken voiceover/dialogue line for that clip).
- Write "explanation", "voDraft", and "reply" in the same language as the user's script/request (e.g. Traditional Chinese / Hong Kong Cantonese when the script or prompt is in Chinese/Cantonese).
- If the user asks to modify only a specific clip (e.g. "Change Clip 2"), keep the other clips intact and update that clip.`,
    prompt: `Main Script / Instruction:\n${input.source.trim() || "(empty)"}${
      input.spokenScript?.trim() ? `\n\nSpoken Script:\n${input.spokenScript.trim()}` : ""
    }\n\nCurrent Clip Drafts:\n${currentText}\n\nRecent Chat History:\n${historyText}\n\nUser Request:\n${input.message.trim()}`,
  });

  const output = generated.output;
  if (!output || !output.clips?.length) {
    throw new Error("AI 分鏡草稿產生失敗，請再試一次");
  }

  return {
    reply: output.reply.trim(),
    drafts: mergeAiDraftsWithExistingSketches(output.clips, input.currentDrafts),
  };
}
