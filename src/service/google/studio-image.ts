import type { GenerationStatus } from "@/model/generation-job";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";

// Nano Banana Pro on Google AI Studio. OpenRouter still carries every other image model.
export const GOOGLE_STUDIO_IMAGE_MODEL = "gemini-3-pro-image";
export const GOOGLE_STUDIO_IMAGE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent";

const MAX_REFS = 14;

type FetchOptions = {
  fetch?: typeof fetch;
};

// ~/.zshrc exports GOOGLE_API_KEY. Existing director calls keep GOOGLE_GENERATIVE_AI_API_KEY.
export function googleStudioApiKey() {
  return (process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();
}

export function googleStudioImageSize(resolution?: "1k" | "2k" | "4k") {
  if (resolution === "4k") return "4K";
  if (resolution === "2k") return "2K";
  return "1K";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function googleError(body: Record<string, unknown>) {
  const err = asRecord(body.error);
  if (typeof err.message === "string" && err.message.trim()) return err.message.trim();
  const feedback = asRecord(body.promptFeedback);
  if (typeof feedback.blockReason === "string" && feedback.blockReason.trim()) {
    return feedback.blockReason.trim();
  }
  return undefined;
}

function nsfwFrom(error?: string): GenerationStatus | undefined {
  if (!error) return undefined;
  if (/nsfw|sensitive|content.?policy|content.?moderat|safety|inappropriate|moderation|prohibited|terms of service/i.test(error)) {
    return "nsfw";
  }
  return undefined;
}

function mimeFrom(header: string | null, bytes: Uint8Array) {
  const declared = header?.split(";")[0]?.trim().toLowerCase();
  if (declared && declared.startsWith("image/")) return declared;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
  return "image/jpeg";
}

// Reference photos become inline parts. Data URLs skip the network.
async function inlineImage(url: string, fetchFn: typeof fetch) {
  const dataUrl = /^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(url.trim());
  if (dataUrl) {
    return { inline_data: { mime_type: dataUrl[1], data: dataUrl[2].replace(/\s/g, "") } };
  }
  const response = await fetchFn(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`參考圖讀取失敗（${response.status}）`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    inline_data: {
      mime_type: mimeFrom(response.headers.get("content-type"), bytes),
      data: Buffer.from(bytes).toString("base64"),
    },
  };
}

function imagePart(part: Record<string, unknown>) {
  const inline = asRecord(part.inline_data ?? part.inlineData);
  const data = typeof inline.data === "string" ? inline.data : "";
  if (!data) return undefined;
  const mime =
    (typeof inline.mime_type === "string" && inline.mime_type) ||
    (typeof inline.mimeType === "string" && inline.mimeType) ||
    "image/png";
  return `data:${mime};base64,${data}`;
}

// Last image part is the finished still. Earlier parts can be thinking drafts.
export function googleStudioImageUrl(body: Record<string, unknown>) {
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const urls: string[] = [];
  for (const candidate of candidates) {
    const content = asRecord(asRecord(candidate).content);
    const parts = Array.isArray(content.parts) ? content.parts : [];
    for (const part of parts) {
      const url = imagePart(asRecord(part));
      if (url) urls.push(url);
    }
  }
  return urls.at(-1);
}

export function googleStudioImageBody(input: {
  prompt: string;
  aspectRatio: AspectRatio | "2:3" | "3:4";
  resolution?: "1k" | "2k" | "4k";
  inlineImages?: Array<{ inline_data: { mime_type: string; data: string } }>;
}) {
  return {
    contents: [
      {
        parts: [
          { text: input.prompt },
          ...(input.inlineImages || []),
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: input.aspectRatio,
        imageSize: googleStudioImageSize(input.resolution),
      },
    },
  };
}

// Synchronous still. Callers persist the data URL; it is not stored in Mongo.
export async function submitGoogleStudioImage(
  input: {
    prompt: string;
    aspectRatio: AspectRatio | "2:3" | "3:4";
    resolution?: "1k" | "2k" | "4k";
    referenceImageUrls?: Array<string | undefined>;
  },
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const apiKey = googleStudioApiKey();
  if (!apiKey) throw new Error("尚未設定 GOOGLE_API_KEY");
  const fetchFn = options?.fetch ?? fetch;
  const refs = (input.referenceImageUrls || [])
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_REFS);
  const inlineImages = [];
  for (const url of refs) {
    inlineImages.push(await inlineImage(url, fetchFn));
  }
  const response = await fetchFn(GOOGLE_STUDIO_IMAGE_URL, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      googleStudioImageBody({
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        inlineImages,
      }),
    ),
    signal: AbortSignal.timeout(8 * 60_000),
  });
  const body = asRecord(await response.json().catch(() => ({})));
  const error = googleError(body);
  if (!response.ok) {
    throw new Error(error || `Google 圖片產生失敗（${response.status}）`);
  }
  const imageUrl = googleStudioImageUrl(body);
  if (!imageUrl) throw new Error(error || "Google 未回傳圖片");
  return {
    request_id: crypto.randomUUID(),
    status: nsfwFrom(error) || "completed",
    images: [{ url: imageUrl }],
    ...(error ? { error } : {}),
  };
}
