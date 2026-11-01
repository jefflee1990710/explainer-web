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
 * - `ref_videos.ref_video_0` (`reference_video`): the SAM 3.1 Grey Mannequin motion-reference MP4 (`H3GreyMannequins`)
 * Official H3 rejects mixing reference roles with `first_frame` / `middle_frame` / `last_frame` (error 2013).
 * - `ref_video_audios.ref_video_audio_0` (`reference_audio`, omitted when `noLipSync: true`)
 */
export function buildMinimaxH3Ref2VaBody(input: {
  prompt: string;
  preparedImageUrl: string;
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
    {
      type: "video_url",
      video_url: { url: input.mannequinVideoUrl },
      role: "reference_video",
    },
  ];

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

export function hasMinimaxApiKey(): boolean {
  return Boolean(minimaxApiKey());
}

/** Submit a MiniMax H3 `ref2va` (Image + SAM Mannequin Reference Video + Optional Audio) job. */
export async function submitMinimaxH3Ref2VaVideo(
  input: {
    prompt: string;
    preparedImageUrl: string;
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
