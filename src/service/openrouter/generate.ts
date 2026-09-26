import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { persistBuffer } from "@/service/higgsfield/persist";

export const OPENROUTER_IMAGE_MODEL = "openai/gpt-5.4-image-2";

const IMAGE_URL = "https://openrouter.ai/api/v1/images";
const MAX_REFS = 16;

export function openRouterApiKey() {
  return process.env.OPENROUTER_API_KEY || "";
}

type OpenRouterImage = {
  b64_json?: string;
  media_type?: string;
};

// Pull the first image out of an Image API body, or a user-facing error.
export function openRouterImageFromBody(body: unknown): {
  image?: OpenRouterImage;
  error?: string;
  nsfw?: boolean;
} {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const errorField = record.error;
  const message =
    typeof errorField === "string"
      ? errorField
      : errorField && typeof errorField === "object" && typeof (errorField as { message?: unknown }).message === "string"
        ? (errorField as { message: string }).message
        : "";
  const data = Array.isArray(record.data) ? (record.data[0] as OpenRouterImage | undefined) : undefined;
  if (data?.b64_json) return { image: data, error: message || undefined };
  const nsfw = /nsfw|content.?policy|moderat|safety|inappropriate/i.test(message);
  return { error: message || "OpenRouter 未回傳圖片", nsfw };
}

function aspectRatio(ratio: AspectRatio) {
  if (ratio === "16:9" || ratio === "9:16" || ratio === "1:1") return ratio;
  return "1:1";
}

// Synchronous image generation. References are character blueprints / annotated stills.
export async function submitOpenRouterImage(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  quality?: "low" | "medium" | "high";
  referenceImageUrls?: Array<string | undefined>;
  negativePrompt?: string;
  model?: string;
}): Promise<GenerationSubmitResult> {
  const key = openRouterApiKey();
  if (!key) throw new Error("尚未設定 OPENROUTER_API_KEY");

  const refs = (input.referenceImageUrls || [])
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_REFS);
  const avoid = input.negativePrompt?.trim();
  const prompt = avoid ? `${input.prompt}\n\nAvoid: ${avoid}` : input.prompt;
  const model = input.model || OPENROUTER_IMAGE_MODEL;

  const response = await fetch(IMAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      aspect_ratio: aspectRatio(input.aspectRatio),
      quality: input.quality || "medium",
      output_format: "png",
      background: "opaque",
      ...(refs.length
        ? {
            input_references: refs.map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          }
        : {}),
    }),
    signal: AbortSignal.timeout(8 * 60_000),
  });

  const body = (await response.json().catch(() => ({}))) as unknown;
  const parsed = openRouterImageFromBody(body);
  if (!response.ok || !parsed.image?.b64_json) {
    throw new Error(parsed.error || `OpenRouter 產圖失敗（${response.status}）`);
  }

  const requestId = crypto.randomUUID();
  const mediaType = parsed.image.media_type || "image/png";
  const url = await persistBuffer(
    Buffer.from(parsed.image.b64_json, "base64"),
    `explainer/openrouter/${requestId}.png`,
    mediaType,
  );

  return {
    request_id: requestId,
    status: "completed",
    images: [{ url }],
  };
}
