import type { GenerationStatus } from "@/model/generation-job";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";

// Official MiniMax video V2. Reference audio cannot be combined with first/last frames.
const MINIMAX_VIDEO_API = "https://api.minimax.io/v2/video_generation";

export const MINIMAX_H3_REFERENCE_MODEL = "MiniMax-H3";

type FetchOptions = { fetch?: typeof fetch };

export function minimaxApiKey() {
  return (process.env.MINIMAX_API_KEY || "").trim();
}

export function minimaxVideoStatusUrl(taskId: string) {
  return `https://api.minimax.io/v2/query/video_generation/${encodeURIComponent(taskId)}`;
}

export function isMinimaxVideoStatusUrl(url: string) {
  return url.startsWith("https://api.minimax.io/v2/query/video_generation/");
}

// Clip length follows the voice. MiniMax-H3 accepts 4–15 whole seconds.
export function talkingHeadReferenceDurationSeconds(audioSeconds: number): number {
  if (!Number.isFinite(audioSeconds) || audioSeconds <= 0) return 5;
  return Math.min(15, Math.max(4, Math.ceil(audioSeconds)));
}

// Performance only. The mp3 is the timing; the still is a closed-mouth identity reference.
export function talkingHeadReferencePrompt(line: string): string {
  const spoken = line.trim();
  return [
    "Seated medium close-up, eyes locked on the camera lens, camera locked.",
    spoken
      ? `The person speaks the reference audio word for word, with continuous syllable-by-syllable lip-sync: "${spoken}".`
      : "The person speaks the reference audio word for word, with continuous syllable-by-syllable lip-sync.",
    "The mouth opens and closes for every spoken word, then settles closed when the line ends.",
    "One small nod and one calm hand gesture. Natural blinks.",
    "No on-screen text, no subtitles, no extra voice.",
  ].join(" ");
}

export function talkingHeadReferenceBody(input: {
  prompt: string;
  imageUrl: string;
  audioUrl: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
}) {
  return {
    model: MINIMAX_H3_REFERENCE_MODEL,
    content: [
      { type: "text" as const, text: input.prompt },
      {
        type: "image_url" as const,
        image_url: { url: input.imageUrl },
        role: "reference_image" as const,
      },
      {
        type: "audio_url" as const,
        audio_url: { url: input.audioUrl },
        role: "reference_audio" as const,
      },
    ],
    resolution: "2K" as const,
    duration: talkingHeadReferenceDurationSeconds(input.durationSeconds),
    ratio: input.aspectRatio,
    aigc_watermark: false,
  };
}

export function mapMinimaxVideoStatus(status: string): GenerationStatus {
  const normalized = status.toLowerCase();
  if (normalized === "succeeded" || normalized === "completed") return "completed";
  if (normalized === "running" || normalized === "processing" || normalized === "in_progress") {
    return "in_progress";
  }
  if (normalized === "failed" || normalized === "cancelled" || normalized === "canceled") {
    return "failed";
  }
  return "queued";
}

function minimaxError(body: unknown) {
  if (!body || typeof body !== "object") return undefined;
  const error = (body as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" && error.message ? error.message : undefined;
}

// Submit a seated talking-head clip: closed-mouth still + the character's voice.
export async function submitTalkingHeadReferenceVideo(
  input: {
    prompt: string;
    imageUrl: string;
    audioUrl: string;
    durationSeconds: number;
    aspectRatio: AspectRatio;
  },
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = minimaxApiKey();
  if (!key) throw new Error("尚未設定 MINIMAX_API_KEY，無法以參考音生成對嘴");
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(MINIMAX_VIDEO_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(talkingHeadReferenceBody(input)),
  });
  const body = (await response.json().catch(() => ({}))) as { task_id?: string };
  if (!response.ok || !body.task_id) {
    throw new Error(minimaxError(body) || `MiniMax 對嘴提交失敗（${response.status}）`);
  }
  return {
    request_id: body.task_id,
    status_url: minimaxVideoStatusUrl(body.task_id),
    status: "queued",
  };
}

// Poll shape matches the rest of the clip pipeline: status + video.url.
export async function fetchMinimaxVideoStatus(
  statusUrl: string,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = minimaxApiKey();
  if (!key) throw new Error("尚未設定 MINIMAX_API_KEY，無法查詢對嘴狀態");
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(statusUrl, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = (await response.json().catch(() => ({}))) as {
    task?: { id?: string; status?: string; content?: { url?: string } };
  };
  if (!response.ok) {
    throw new Error(minimaxError(body) || `MiniMax 對嘴狀態查詢失敗（${response.status}）`);
  }
  const task = body.task;
  const status = mapMinimaxVideoStatus(task?.status || "");
  const videoUrl = task?.content?.url;
  const taskId = statusUrl.split("/").pop() || task?.id || "";
  return {
    request_id: taskId,
    status_url: statusUrl,
    status,
    ...(videoUrl ? { video: { url: videoUrl } } : {}),
    ...(status === "failed" ? { error: minimaxError(body) || task?.status || "failed" } : {}),
  };
}
