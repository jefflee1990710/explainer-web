import type { AspectRatio } from "@/types/project";
import {
  ALICLOUD_IMAGE_EDIT_MODEL,
  ALICLOUD_IMAGE_MODEL,
  ALICLOUD_VIDEO_MODEL,
  alicloudApiKey,
  dashscopeError,
  dashscopeRequest,
  dashscopeTaskUrl,
  imageSizeForRatio,
  mapDashscopeStatus,
  mediaUrlFromDashscope,
  wanDurationSeconds,
} from "@/lib/alicloud/dashscope";
import type { GenerationStatus } from "@/types/generation-job";

export type GenerationSubmitResult = {
  request_id: string;
  status_url?: string;
  status: GenerationStatus;
  images?: Array<{ url: string }>;
  video?: { url: string };
  error?: string;
};

// Edit-plus accepts 1–3 reference images; keep the earliest (annotated / lock).
const MAX_EDIT_REFS = 3;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function taskIdFrom(body: Record<string, unknown>) {
  const output = asRecord(body.output);
  if (typeof output.task_id === "string" && output.task_id) return output.task_id;
  return undefined;
}

function nsfwFrom(error?: string): GenerationStatus | undefined {
  if (!error) return undefined;
  if (/nsfw|sensitive|content.?moderat|datainspection|inappropriate|违规|敏感/i.test(error)) {
    return "nsfw";
  }
  return undefined;
}

function resultFromTask(
  body: Record<string, unknown>,
  statusUrl?: string,
): GenerationSubmitResult {
  const output = asRecord(body.output);
  const taskStatus =
    (typeof output.task_status === "string" && output.task_status) ||
    (typeof body.task_status === "string" && body.task_status) ||
    "";
  const requestId =
    taskIdFrom(body) ||
    (typeof body.request_id === "string" && body.request_id) ||
    crypto.randomUUID();
  const error = dashscopeError(body);
  const mediaUrl = mediaUrlFromDashscope(body);
  const status = nsfwFrom(error) || (taskStatus ? mapDashscopeStatus(taskStatus) : mediaUrl ? "completed" : "queued");
  const isVideo = Boolean(output.video_url) || /\.mp4(\?|$)/i.test(mediaUrl || "");

  return {
    request_id: requestId,
    status_url: statusUrl,
    status,
    ...(mediaUrl && !isVideo ? { images: [{ url: mediaUrl }] } : {}),
    ...(mediaUrl && isVideo ? { video: { url: mediaUrl } } : {}),
    ...(error ? { error } : {}),
  };
}

function resultFromSyncImage(body: Record<string, unknown>): GenerationSubmitResult {
  const mediaUrl = mediaUrlFromDashscope(body);
  const error = dashscopeError(body);
  const requestId =
    (typeof body.request_id === "string" && body.request_id) || crypto.randomUUID();
  if (error && !mediaUrl) {
    throw new Error(error);
  }
  if (!mediaUrl) {
    throw new Error("AliCloud 未回傳圖片");
  }
  return {
    request_id: requestId,
    status: nsfwFrom(error) || "completed",
    images: [{ url: mediaUrl }],
    ...(error ? { error } : {}),
  };
}

export async function submitAlicloudImage(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  referenceImageUrls?: Array<string | undefined>;
  negativePrompt?: string;
}): Promise<GenerationSubmitResult> {
  const refs = (input.referenceImageUrls || [])
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_EDIT_REFS);
  const size = imageSizeForRatio(input.aspectRatio);

  // 3.0-pro does T2I and I2I on the same multimodal endpoint.
  const { base, body } = await dashscopeRequest(
    "/services/aigc/multimodal-generation/generation",
    {
      method: "POST",
      timeoutMs: 8 * 60_000,
      body: JSON.stringify({
        model: refs.length > 0 ? ALICLOUD_IMAGE_EDIT_MODEL : ALICLOUD_IMAGE_MODEL,
        input: {
          messages: [
            {
              role: "user",
              content: [
                ...refs.map((url) => ({ image: url })),
                { text: input.prompt },
              ],
            },
          ],
        },
        parameters: {
          n: 1,
          size,
          // Keep the director/frame prompt verbatim (exact subtitle spelling).
          prompt_extend: false,
          enable_thinking: false,
          watermark: false,
          ...(input.negativePrompt
            ? { negative_prompt: input.negativePrompt }
            : {}),
        },
      }),
    },
  );
  const output = asRecord(body.output);
  if (typeof output.task_id === "string" && output.task_id) {
    return resultFromTask(body, dashscopeTaskUrl(base, output.task_id));
  }
  return resultFromSyncImage(body);
}

export async function submitAlicloudClipVideo(input: {
  prompt: string;
  durationSeconds: number;
  startImageUrl: string;
  endImageUrl: string;
}): Promise<GenerationSubmitResult> {
  const { base, body } = await dashscopeRequest(
    "/services/aigc/video-generation/video-synthesis",
    {
      method: "POST",
      async: true,
      body: JSON.stringify({
        model: ALICLOUD_VIDEO_MODEL,
        input: {
          prompt: input.prompt,
          media: [
            { type: "first_frame", url: input.startImageUrl },
            { type: "last_frame", url: input.endImageUrl },
          ],
        },
        parameters: {
          resolution: "720P",
          duration: wanDurationSeconds(input.durationSeconds),
          prompt_extend: false,
          watermark: false,
        },
      }),
    },
  );
  const id = taskIdFrom(body);
  if (!id) throw new Error(dashscopeError(body) || "AliCloud 未回傳 task_id");
  return resultFromTask(body, dashscopeTaskUrl(base, id));
}

export async function fetchAlicloudStatus(statusUrl: string): Promise<GenerationSubmitResult> {
  const key = alicloudApiKey();
  if (!key) throw new Error("尚未設定 AliCloud API key");

  const response = await fetch(statusUrl, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(dashscopeError(body) || `AliCloud 狀態查詢失敗（${response.status}）`);
  }
  return resultFromTask(body, statusUrl);
}
