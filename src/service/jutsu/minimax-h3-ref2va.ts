import type { JutsuPersonMapping } from "@/model/jutsu-job";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import {
  mapMinimaxVideoStatus,
  minimaxApiKey,
  minimaxVideoStatusUrl,
  MINIMAX_H3_REFERENCE_MODEL,
  talkingHeadReferenceDurationSeconds,
} from "@/service/minimax/talking-head-reference";

const MINIMAX_VIDEO_API = "https://api.minimax.io/v2/video_generation";

type FetchOptions = { fetch?: typeof fetch };

/**
 * Ported from Openjutsu `MiniMaxH3ReferenceToVideo` (`workflows/simple.api.json` node 30):
 * Builds the MiniMax H3 `ref2va` payload conditioning on:
 * - `ref_images.ref_image_0` (`reference_image`): the prepared character / outfit image
 * - `ref_images.ref_image_1` (`reference_image`, optional): the original character photo, so H3 keeps the face
 * - `ref_videos.ref_video_0` (`reference_video`): the SAM 3.1 Grey Mannequin motion-reference MP4 (`H3GreyMannequins`)
 * Official H3 rejects mixing reference roles with `first_frame` / `middle_frame` / `last_frame` (error 2013).
 * Reference-to-video accepts up to 9 reference images.
 * - `ref_video_audios.ref_video_audio_0` (`reference_audio`, omitted when `noLipSync: true`)
 */
export function buildMinimaxH3Ref2VaBody(input: {
  prompt: string;
  preparedImageUrl: string;
  identityImageUrl?: string;
  identityImageUrls?: readonly string[];
  mannequinVideoUrl: string;
  audioUrl?: string;
  noLipSync?: boolean;
  durationSeconds: number;
  aspectRatio: AspectRatio;
}) {
  const promptText = input.noLipSync
    ? `${input.prompt.trim()} Nobody sings or speaks along to the music; mouths stay naturally relaxed.`
    : input.prompt.trim();

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string }; role: "reference_image" }
    | { type: "video_url"; video_url: { url: string }; role: "reference_video" }
    | { type: "audio_url"; audio_url: { url: string }; role: "reference_audio" }
  > = [
    { type: "text", text: promptText },
    {
      type: "image_url",
      image_url: { url: input.preparedImageUrl },
      role: "reference_image",
    },
  ];

  const rawIdentityList =
    input.identityImageUrls && input.identityImageUrls.length > 0
      ? input.identityImageUrls
      : input.identityImageUrl
        ? [input.identityImageUrl]
        : [];

  const seenUrls = new Set<string>([input.preparedImageUrl]);
  for (const rawUrl of rawIdentityList) {
    const url = rawUrl?.trim();
    if (!url || seenUrls.has(url)) continue;
    if (seenUrls.size >= 9) break;
    seenUrls.add(url);
    content.push({
      type: "image_url",
      image_url: { url },
      role: "reference_image",
    });
  }

  content.push({
    type: "video_url",
    video_url: { url: input.mannequinVideoUrl },
    role: "reference_video",
  });

  if (input.audioUrl && !input.noLipSync) {
    content.push({
      type: "audio_url",
      audio_url: { url: input.audioUrl },
      role: "reference_audio",
    });
  }

  return {
    model: MINIMAX_H3_REFERENCE_MODEL,
    resolution: "2K" as const,
    duration: talkingHeadReferenceDurationSeconds(input.durationSeconds),
    ratio: input.aspectRatio,
    aigc_watermark: false,
    content,
  };
}

/** Text prompt for the H3 ref2va render. Reference numbering must match `buildMinimaxH3Ref2VaBody` order. */
export function buildJutsuRef2VaPrompt(input: {
  motionText: string;
  lightText?: string;
  hasIdentityImage: boolean;
  hasReferenceAudio?: boolean;
  characterOutfitSpec?: string;
  personMappings?: readonly JutsuPersonMapping[];
}): string {
  const mappings = input.personMappings
    ? [...input.personMappings].sort(
        (a, b) => a.box.x + a.box.width / 2 - (b.box.x + b.box.width / 2),
      )
    : [];
  const audioLock = input.hasReferenceAudio
    ? "Reference audio 1 is the spoken voice. Synchronize the person's lip and mouth movements accurately word-for-word with Reference audio 1, and keep the mouth naturally relaxed when silent."
    : "";

  if (mappings.length > 1) {
    const locks = mappings.map((m, idx) => {
      const refNum = idx + 2;
      const cx = Math.round((m.box.x + m.box.width / 2) * 100);
      const spec = m.characterOutfitSpec?.trim()
        ? ` (${m.characterOutfitSpec.trim()})`
        : "";
      return `Reference image ${refNum} locks the true face, identity, and exact full-body outfit${spec} for the swapped person at ~${cx}% horizontal position`;
    });
    return [
      "Reference image 1 is the prepared scene with the swapped characters and background to preserve. Reference video 1 shows grey mannequins performing the target motion for the swapped people while unmapped people stay as-is.",
      `${locks.join(". ")}.`,
      "Follow each grey mannequin's exact head angle, gaze, facial expression, mouth opening, pose, hands, and timing in Reference video 1 while keeping every character's face, outfit, any unmapped people, and the background from Reference image 1.",
      audioLock,
      input.motionText,
      input.lightText ? `Lighting remains consistent: ${input.lightText}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const cleanOutfit = (
    mappings[0]?.characterOutfitSpec ||
    input.characterOutfitSpec ||
    ""
  ).trim();
  return [
    "Reference image 1 is the person, outfit, and the source scene/background to preserve. Reference video 1 is a grey mannequin performing the motion.",
    input.hasIdentityImage
      ? "Reference image 2 is the true face, identity, and exact outfit of this character: keep that exact face shape, eyes, nose, mouth, skin, and exact outfit (every garment, neckline, sleeve length, color, fabric texture, and graphic print) in every frame, including when hands move near the face."
      : "Keep the exact outfit from Reference image 1 (every garment, neckline, sleeve length, color, fabric texture, and graphic print) unchanged in every frame.",
    cleanOutfit ? `Character outfit lock: ${cleanOutfit}.` : "",
    "Follow the mannequin's exact head angle, gaze, facial expression, mouth opening, pose, hands, and timing, while keeping the person, the exact background/room, and any on-screen text or graphic letters from Reference image 1.",
    audioLock,
    input.motionText,
    input.lightText ? `Lighting remains consistent: ${input.lightText}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function hasMinimaxApiKey(): boolean {
  return Boolean(minimaxApiKey());
}

/** Submit a MiniMax H3 `ref2va` (Image + SAM Mannequin Reference Video + Optional Audio) job. */
export async function submitMinimaxH3Ref2VaVideo(
  input: {
    prompt: string;
    preparedImageUrl: string;
    identityImageUrl?: string;
    identityImageUrls?: readonly string[];
    mannequinVideoUrl: string;
    audioUrl?: string;
    noLipSync?: boolean;
    durationSeconds: number;
    aspectRatio: AspectRatio;
  },
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = minimaxApiKey();
  if (!key) {
    throw new Error("尚未設定 MINIMAX_API_KEY");
  }
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(MINIMAX_VIDEO_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildMinimaxH3Ref2VaBody(input)),
  });

  const body = (await response.json().catch(() => ({}))) as {
    task_id?: string;
    base_resp?: { status_code?: number; status_msg?: string };
    error?: { message?: string };
  };

  if (!response.ok || (body.base_resp?.status_code && body.base_resp.status_code !== 0)) {
    throw new Error(
      body.error?.message ||
        body.base_resp?.status_msg ||
        `MiniMax H3 ref2va 請求失敗（${response.status}）`,
    );
  }
  if (!body.task_id) {
    throw new Error("MiniMax H3 ref2va 未回傳 task_id");
  }

  return {
    status: "queued",
    request_id: body.task_id,
    status_url: minimaxVideoStatusUrl(body.task_id),
  };
}

export { mapMinimaxVideoStatus };
