import type { GenerationStatus } from "@/model/generation-job";
import type { AspectRatio, VoLanguage } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { withCantonesePronunciation } from "@/service/voice/cantonese-pronunciation";

// Official MiniMax video V2. First/last frames and reference audio are separate calls.
const MINIMAX_VIDEO_API = "https://api.minimax.io/v2/video_generation";

export const MINIMAX_H3_REFERENCE_MODEL = "MiniMax-H3";

// Bridge lands the clip on the next still. Follow redraws the mouth on that video.
export type TalkingHeadStage = "bridge" | "follow";

type FetchOptions = { fetch?: typeof fetch };

const TALKING_HEAD_LANGUAGE_NAMES: Record<VoLanguage, string> = {
  yue: "Hong Kong Cantonese (廣東話, never Mandarin)",
  zh: "Mandarin Chinese (普通話／國語)",
  en: "English",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  id: "Indonesian (Bahasa Indonesia)",
  es: "Spanish (Español)",
  pt: "Portuguese (Português)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  ru: "Russian (Русский)",
  vi: "Vietnamese (Tiếng Việt)",
  th: "Thai (ภาษาไทย)",
  ms: "Malay (Bahasa Melayu)",
  fil: "Filipino / Tagalog",
  hi: "Hindi (हिन्दी)",
  ar: "Arabic (العربية)",
  it: "Italian (Italiano)",
  nl: "Dutch (Nederlands)",
  pl: "Polish (Polski)",
  tr: "Turkish (Türkçe)",
};

// Human-readable language label for MiniMax pass-1 and pass-2 lip-sync prompts.
export function talkingHeadLanguageName(language?: VoLanguage): string | undefined {
  return language ? TALKING_HEAD_LANGUAGE_NAMES[language] : undefined;
}

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

// Pass 1. Motion runs from this clip's start still to the next clip's start still.
export function talkingHeadBridgePrompt(line: string, language?: VoLanguage): string {
  const spoken = line.trim();
  const langName = talkingHeadLanguageName(language);
  const inLang = langName ? ` in ${langName}` : "";
  const base = [
    "Seated medium close-up, eyes locked on the camera lens, camera locked.",
    spoken
      ? `The person speaks this line${inLang}, mouth moving for every word, then the mouth settles closed: "${spoken}".`
      : `The person speaks${inLang}, mouth moving, then the mouth settles closed.`,
    "One small nod and one calm hand gesture. Natural blinks.",
    "The last frame lands on the end image: same crop, same posture, same closed mouth.",
    "No on-screen text, no subtitles, no extra voice.",
  ].join(" ");
  return withCantonesePronunciation(base, language, spoken);
}

// Pass 2. The bridge video is the motion; the mp3 is the mouth.
export function talkingHeadFollowPrompt(line: string, language?: VoLanguage): string {
  const spoken = line.trim();
  const langName = talkingHeadLanguageName(language);
  const inLang = langName ? ` in ${langName}` : "";
  const base = [
    "Video 1 is the performance. Keep its camera, body, hands, and ending posture.",
    langName
      ? `Audio 1 is the only voice, spoken in ${langName}. The mouth follows Audio 1 word for word with exact ${langName} syllable articulation, then settles closed when the line ends.`
      : "Audio 1 is the only voice. The mouth follows Audio 1 word for word, then settles closed when the line ends.",
    spoken ? `The spoken line${inLang} is: "${spoken}".` : "",
    "No on-screen text, no subtitles, no extra voice.",
  ]
    .filter(Boolean)
    .join(" ");
  return withCantonesePronunciation(base, language, spoken);
}

function talkingHeadVideoFields(durationSeconds: number, aspectRatio: AspectRatio) {
  return {
    model: MINIMAX_H3_REFERENCE_MODEL,
    resolution: "2K" as const,
    duration: talkingHeadReferenceDurationSeconds(durationSeconds),
    ratio: aspectRatio,
    aigc_watermark: false,
  };
}

// First frame plus last frame. No audio: this call only locks the cut.
export function talkingHeadBridgeBody(input: {
  prompt: string;
  startImageUrl: string;
  endImageUrl: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
}) {
  return {
    ...talkingHeadVideoFields(input.durationSeconds, input.aspectRatio),
    content: [
      { type: "text" as const, text: input.prompt },
      {
        type: "image_url" as const,
        image_url: { url: input.startImageUrl },
        role: "first_frame" as const,
      },
      {
        type: "image_url" as const,
        image_url: { url: input.endImageUrl },
        role: "last_frame" as const,
      },
    ],
  };
}

// Reference video plus reference audio. Official H3 cannot add a last frame here.
export function talkingHeadFollowBody(input: {
  prompt: string;
  videoUrl: string;
  audioUrl: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
}) {
  return {
    ...talkingHeadVideoFields(input.durationSeconds, input.aspectRatio),
    content: [
      { type: "text" as const, text: input.prompt },
      {
        type: "video_url" as const,
        video_url: { url: input.videoUrl },
        role: "reference_video" as const,
      },
      {
        type: "audio_url" as const,
        audio_url: { url: input.audioUrl },
        role: "reference_audio" as const,
      },
    ],
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

async function submitMinimaxVideo(
  body: unknown,
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
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { task_id?: string };
  if (!response.ok || !payload.task_id) {
    throw new Error(minimaxError(payload) || `MiniMax 對嘴提交失敗（${response.status}）`);
  }
  return {
    request_id: payload.task_id,
    status_url: minimaxVideoStatusUrl(payload.task_id),
    status: "queued",
  };
}

// Pass 1 submit: start still to the next clip's start still.
export function submitTalkingHeadBridgeVideo(
  input: {
    prompt: string;
    startImageUrl: string;
    endImageUrl: string;
    durationSeconds: number;
    aspectRatio: AspectRatio;
  },
  options?: FetchOptions,
) {
  return submitMinimaxVideo(talkingHeadBridgeBody(input), options);
}

// Pass 2 submit: bridge video plus the ElevenLabs mp3.
export function submitTalkingHeadFollowVideo(
  input: {
    prompt: string;
    videoUrl: string;
    audioUrl: string;
    durationSeconds: number;
    aspectRatio: AspectRatio;
  },
  options?: FetchOptions,
) {
  return submitMinimaxVideo(talkingHeadFollowBody(input), options);
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
