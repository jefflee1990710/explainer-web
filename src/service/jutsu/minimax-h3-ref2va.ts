import { normalizeJutsuReferenceUrls, type JutsuPersonMapping } from "@/model/jutsu-job";
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

/**
 * H3 ref2va prompt in Openjutsu's section order
 * (`subject_definitions` / `summary` / `detailed_description` / `overall_soundscape`).
 * Reference numbering matches `buildMinimaxH3Ref2VaBody`.
 * The motion line is the two-pass describer; the picture is appearance, the grey video is motion.
 */
export function buildJutsuRef2VaPrompt(input: {
  motionText: string;
  lightText?: string;
  hasIdentityImage: boolean;
  identityImageCount?: number;
  hasReferenceAudio?: boolean;
  characterOutfitSpec?: string;
  personMappings?: readonly JutsuPersonMapping[];
}): string {
  const mappings = input.personMappings
    ? [...input.personMappings].sort(
        (a, b) => a.box.x + a.box.width / 2 - (b.box.x + b.box.width / 2),
      )
    : [];
  const cleanOutfit = (
    mappings.length > 1
      ? ""
      : mappings[0]?.characterOutfitSpec || input.characterOutfitSpec || ""
  ).trim();

  const subjects = [
    "subject_definitions:",
    "<Picture 1> (Reference image 1) defines the character, outfit, background, colors, materials and lighting throughout the output.",
  ];
  if (mappings.length > 1) {
    let nextRefNum = 2;
    for (const mapping of mappings) {
      if (nextRefNum > 9) break;
      const urls = normalizeJutsuReferenceUrls(
        mapping.referenceImageUrls,
        mapping.referenceImageUrl,
      );
      const count = Math.max(1, urls.length);
      const startRef = nextRefNum;
      const endRef = Math.min(9, nextRefNum + count - 1);
      nextRefNum = endRef + 1;
      const cx = Math.round((mapping.box.x + mapping.box.width / 2) * 100);
      const spec = mapping.characterOutfitSpec?.trim()
        ? ` (${mapping.characterOutfitSpec.trim()})`
        : "";
      const refLabel =
        startRef === endRef
          ? `<Picture ${startRef}> (Reference image ${startRef}) locks`
          : `<Picture ${startRef}> to <Picture ${endRef}> (Reference images ${startRef} to ${endRef}) lock`;
      subjects.push(
        `${refLabel} the true face, identity, and exact full-body outfit${spec} for the swapped person at ~${cx}% horizontal position.`,
      );
    }
  } else if (input.hasIdentityImage) {
    const singlePersonUrls = mappings[0]
      ? normalizeJutsuReferenceUrls(
          mappings[0].referenceImageUrls,
          mappings[0].referenceImageUrl,
        )
      : [];
    const idCount = Math.max(
      1,
      input.identityImageCount ?? (singlePersonUrls.length || 1),
    );
    if (idCount > 1) {
      const endRef = Math.min(9, idCount + 1);
      subjects.push(
        `Reference images 2 to ${endRef} lock the true face, identity, and exact outfit of this character across multiple reference views: keep that exact face shape, eyes, nose, mouth, skin, and exact outfit (every garment, neckline, sleeve length, color, fabric texture, and graphic print) in every frame, including when hands move near the face.`,
      );
    } else {
      subjects.push(
        "Reference image 2 locks the true face, identity, and exact outfit of this character: keep that exact face shape, eyes, nose, mouth, skin, and exact outfit (every garment, neckline, sleeve length, color, fabric texture, and graphic print) in every frame, including when hands move near the face.",
      );
    }
  } else {
    subjects.push(
      "Keep the exact outfit from Reference image 1 (every garment, neckline, sleeve length, color, fabric texture, and graphic print) unchanged in every frame.",
    );
  }
  if (cleanOutfit) subjects.push(`Character outfit lock: ${cleanOutfit}.`);
  subjects.push(
    "<Video 1> (Reference video 1) is a smooth grey mannequin motion guide at 24 fps. The grey figure supplies body pose, gestures, head direction, gaze, facial expression, mouth opening, framing and timing. Its grey colors are not the appearance of the final video.",
  );
  if (input.hasReferenceAudio) {
    subjects.push(
      "<Audio 1> (Reference audio 1) is the original synchronized soundtrack. Synchronize the person's lip and mouth movements accurately word-for-word with Reference audio 1, and keep the mouth naturally relaxed when silent.",
    );
  }

  const detail = [
    "detailed_description:",
    input.motionText.trim(),
    "Follow the motion guide's poses and gestures at the corresponding moments, through the last frame. Match its relative character size, camera perspective and any camera movement. Keep the picture's environment coherent throughout the performance. Do not copy the grey colors or replace the picture's setting with the source video's setting. Preserve any on-screen text or graphic letters from Reference image 1.",
  ];
  if (input.lightText?.trim()) {
    detail.push(`Lighting remains consistent with the picture: ${input.lightText.trim()}`);
  }

  return [
    ...subjects,
    "",
    "summary:",
    "[video editing + reference generation + audio reuse] Animate the character from Reference image 1 with the performance and framing of the grey figure in Reference video 1. Keep the identity, outfit, background and lighting of Reference image 1. The picture is the appearance reference; the grey mannequin video is the motion reference. Do not hold the reference picture's starting pose as the guide moves.",
    "",
    ...detail,
    "",
    "overall_soundscape:",
    input.hasReferenceAudio
      ? "Reuse Reference audio 1 unchanged. Add no new voices, music or sound effects."
      : "Keep the soundtrack coherent with the performance. Add no unrelated voices or music.",
  ].join("\n");
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
