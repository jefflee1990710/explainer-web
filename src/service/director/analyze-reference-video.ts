import { generateText, Output } from "ai";
import { z } from "zod";
import type { IDirectorBehavior } from "@/model/director";
import type { PerformanceSlots } from "@/model/director-performance";
import type { DirectorProfile } from "@/model/director-profile";
import {
  DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
  normalizeDirectorBehavior,
} from "@/service/director/compile-director-prompts";
import { directorModel } from "@/service/director/model";
import { emptyPerformance } from "@/service/director/performance";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const MAX_VIDEO_BYTES = 35 * 1024 * 1024;

const analyzedDirectorSchema = z.object({
  title: z.string(),
  description: z.string(),
  suggestedUseCase: z.string(),
  speechMode: z.enum(["lip-sync", "narrator", "silent"]),
  audioFirstLipSync: z.boolean(),
  wardrobeBuild: z.boolean(),
  keyframeMode: z.enum(["start-only", "end-is-next-start"]),
  chainsClipStarts: z.boolean(),
  anchorsFramesToFirstClip: z.boolean(),
  dualBeat: z.boolean(),
  requiredCastCount: z.union([z.literal(1), z.literal(2)]),
  maxBackgroundSets: z.number().int().min(1).max(4),
  requiresSpokenScript: z.boolean(),
  profile: z.object({
    bestFor: z.string(),
    structure: z.string(),
    hook: z.string(),
    arc: z.string(),
    narrator: z.string(),
    visual: z.string(),
    audio: z.string(),
    rules: z.string(),
  }),
  performance: z
    .object({
      restingFace: z.string(),
      emphasisBeat: z.string(),
      hookBeat: z.string(),
      ctaBeat: z.string(),
      gestureLibrary: z.string(),
      headMotion: z.string(),
      anchorProp: z.string(),
      set: z.string(),
      light: z.string(),
    })
    .optional(),
  extraInstructions: z.string(),
});

export type AnalyzedDirectorBlueprint = {
  title: string;
  description: string;
  suggestedUseCase: string;
  behavior: IDirectorBehavior;
  profile: DirectorProfile;
  performance?: PerformanceSlots;
  extraInstructions: string;
};

// Extract direct MP4 video_url and caption from a public Instagram Reel / Post URL.
export async function resolveReferenceVideoSource(urlRaw: string): Promise<{
  videoBytes?: Uint8Array;
  mimeType: string;
  caption: string;
}> {
  const url = urlRaw.trim();
  if (!url) return { mimeType: "video/mp4", caption: "" };

  const igMatch = url.match(/instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i);
  if (igMatch) {
    const shortcode = igMatch[1];
    const embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/captioned/`;
    const htmlRes = await fetch(embedUrl, {
      headers: { "User-Agent": MOBILE_UA },
      signal: AbortSignal.timeout(25_000),
    });
    if (!htmlRes.ok) {
      throw new Error("無法讀取此 Instagram 連結，請確認為公開 Reel 或直接上傳 MP4 影片檔");
    }
    const html = await htmlRes.text();
    const capMatch = html.match(/class="Caption"[\s\S]{0,1800}/);
    const caption = capMatch
      ? capMatch[0]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";
    const idx = html.indexOf("video_url");
    if (idx >= 0) {
      const slice = html.slice(idx, idx + 1600);
      const m = slice.match(/video_url\\?":\\?"([^"]+)/);
      if (m?.[1]) {
        const directUrl = m[1]
          .replace(/\\\\u0026/g, "&")
          .replace(/\\u0026/g, "&")
          .replace(/\\\\\//g, "/")
          .replace(/\\\//g, "/")
          .replace(/\\+$/, "")
          .trim();
        const vidRes = await fetch(directUrl, {
          headers: { "User-Agent": MOBILE_UA },
          signal: AbortSignal.timeout(35_000),
        });
        if (vidRes.ok) {
          const buf = new Uint8Array(await vidRes.arrayBuffer());
          if (buf.byteLength <= MAX_VIDEO_BYTES) {
            return { videoBytes: buf, mimeType: "video/mp4", caption };
          }
        }
      }
    }
    if (caption) {
      return { mimeType: "video/mp4", caption };
    }
    throw new Error("此 Instagram 連結受保護無法擷取影片，請直接上傳 MP4 影片檔或補充文字描述");
  }

  // Direct MP4 / video URL
  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url, {
      headers: { "User-Agent": MOBILE_UA },
      signal: AbortSignal.timeout(35_000),
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "video/mp4";
      if (contentType.startsWith("video/") || /\.mp4(\?|$)/i.test(url)) {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength <= MAX_VIDEO_BYTES) {
          return { videoBytes: buf, mimeType: "video/mp4", caption: "" };
        }
      }
    }
  }

  return { mimeType: "video/mp4", caption: "" };
}

export async function analyzeReferenceVideoToDirector(input: {
  videoUrl?: string;
  videoBytes?: Uint8Array;
  mimeType?: string;
  titleHint?: string;
  notes?: string;
}): Promise<AnalyzedDirectorBlueprint> {
  let bytes = input.videoBytes;
  let mimeType = input.mimeType || "video/mp4";
  let caption = "";

  if (!bytes && input.videoUrl?.trim()) {
    const resolved = await resolveReferenceVideoSource(input.videoUrl);
    bytes = resolved.videoBytes;
    mimeType = resolved.mimeType;
    caption = resolved.caption;
  }

  const userNotes = [
    input.titleHint?.trim() ? `User's desired director title: ${input.titleHint.trim()}` : "",
    input.notes?.trim() ? `User's focus & notes: ${input.notes.trim()}` : "",
    input.videoUrl?.trim() ? `Reference URL: ${input.videoUrl.trim()}` : "",
    caption ? `Extracted Reel caption: ${caption}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!bytes && !userNotes) {
    throw new Error("請貼上參考 Reel 連結、上傳 MP4 短片，或輸入想建立嘅導演風格描述");
  }

  const systemPrompt = `You are a master AI Film & Short-Form Video Director Architect.
Analyze the provided reference video (and/or user notes & caption) and reverse-engineer it into a complete, reusable standalone Director specification in Traditional Chinese (繁體中文).

Decide the exact pipeline behavior:
- speechMode:
  - "lip-sync" if the on-screen character speaks to camera or an off-camera interviewer (including A-roll interview + B-roll cutaways).
  - "narrator" if an unseen off-screen voiceover narrates while characters keep their mouths closed.
  - "silent" if it is a pure fashion/lookbook/action showcase with music/SFX only and no spoken words.
- audioFirstLipSync: true ONLY if the entire video is a continuous single-shot talking-head read without B-roll cutaways; false if it alternates A-roll and B-roll or multiple scene angles.
- wardrobeBuild: true if the video's primary purpose is demonstrating clothing/outfits from reference photos.
- keyframeMode: "end-is-next-start" for continuous single-camera reads; "start-only" for multi-angle / B-roll / explainer cuts.

Fill all 8 profile fields (bestFor, structure, hook, arc, narrator, visual, audio, rules) in clear, concrete Traditional Chinese, and include detailed shot-by-shot cinematography & editing rules in extraInstructions.`;

  const promptText =
    userNotes || "Analyze the attached reference video and extract its complete director blueprint.";

  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: analyzedDirectorSchema }),
    system: systemPrompt,
    ...(bytes
      ? {
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "file" as const, data: bytes, mediaType: mimeType },
                { type: "text" as const, text: promptText },
              ],
            },
          ],
        }
      : { prompt: promptText }),
  });

  const behavior = normalizeDirectorBehavior(
    {
      ...DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
      speechMode: output.speechMode,
      audioFirstLipSync: output.audioFirstLipSync,
      wardrobeBuild: output.wardrobeBuild,
      keyframeMode: output.keyframeMode,
      chainsClipStarts: output.chainsClipStarts,
      anchorsFramesToFirstClip: output.anchorsFramesToFirstClip,
      dualBeat: output.dualBeat,
      requiredCastCount: output.requiredCastCount,
      maxBackgroundSets: output.maxBackgroundSets,
      requiresSpokenScript: output.requiresSpokenScript,
    },
    DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
  );

  return {
    title: (input.titleHint?.trim() || output.title.trim() || "自訂導演").slice(0, 60),
    description: output.description.trim().slice(0, 300),
    suggestedUseCase: output.suggestedUseCase.trim().slice(0, 300),
    behavior,
    profile: output.profile,
    ...(output.speechMode === "lip-sync"
      ? { performance: { ...emptyPerformance(), ...(output.performance ?? {}) } }
      : {}),
    extraInstructions: output.extraInstructions.trim().slice(0, 4000),
  };
}
