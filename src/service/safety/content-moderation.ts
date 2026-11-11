import { assertOpenRouterKey, OPENROUTER_BASE_URL } from "@/service/openrouter/generate";

export const CONTENT_SAFETY_MODEL =
  process.env.CONTENT_SAFETY_MODEL || "qwen/qwen-2.5-vl-72b-instruct";

export type ContentSafetyCheckResult = {
  isSafe: boolean;
  category: "safe" | "adult_pornography" | "csam" | "violence" | "unknown";
  reason?: string;
};

const SAFETY_SYSTEM_PROMPT = `You are a strict Content Moderation Safety Auditor for an AI video generation service.
Analyze the provided image for any of the following strictly prohibited categories:
1. Pornography, explicit sexual acts, intercourse, penetration, oral sex, exposed genitalia (penis, vulva), or sexual nudity.
2. Non-consensual intimate imagery, upskirt, or voyeuristic adult content.
3. Child sexual abuse material (CSAM) or any sexual depiction/nudity of minors (under 18).
4. Extreme gore, mutilation, self-harm, or graphic violence.

Respond strictly with valid JSON (no markdown formatting, no code blocks):
{"isSafe": boolean, "category": "safe" | "adult_pornography" | "csam" | "violence", "reason": string}`;

/**
 * Checks an image (either as a public URL or as a raw Buffer) for adult/NSFW content.
 * Returns { isSafe: true } for benign media, or { isSafe: false, reason } for violations.
 */
export async function checkImageSafety(
  target: { url?: string; buffer?: Buffer; mimeType?: string },
  options: { fetch?: typeof fetch } = {},
): Promise<ContentSafetyCheckResult> {
  const fetchFn = options.fetch ?? fetch;
  const key = assertOpenRouterKey();

  let imageUrl: string;
  if (target.buffer) {
    const mime = target.mimeType || "image/webp";
    imageUrl = `data:${mime};base64,${target.buffer.toString("base64")}`;
  } else if (target.url?.startsWith("http://") || target.url?.startsWith("https://")) {
    imageUrl = target.url;
  } else {
    return { isSafe: true, category: "safe" };
  }

  try {
    const res = await fetchFn(`${OPENROUTER_BASE_URL}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CONTENT_SAFETY_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SAFETY_SYSTEM_PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 150,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      console.warn(`[content-moderation] safety check API returned status ${res.status}`);
      // Fail-open on transient network timeout to avoid blocking regular users if audit endpoint fluctuates,
      // but log for monitoring.
      return { isSafe: true, category: "safe" };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "";

    // Strip optional markdown code fences ```json ... ```
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      isSafe?: boolean;
      category?: string;
      reason?: string;
    };

    const isSafe = Boolean(parsed.isSafe ?? (parsed.category === "safe"));
    const category = (parsed.category as ContentSafetyCheckResult["category"]) || (isSafe ? "safe" : "unknown");

    return {
      isSafe,
      category,
      reason: parsed.reason,
    };
  } catch (error) {
    console.error("[content-moderation] safety check failed or threw:", error);
    return { isSafe: true, category: "safe" };
  }
}

/**
 * Asserts that an image buffer does not contain NSFW/adult material.
 * Throws an Error if content violates the safety policy.
 */
export async function assertSafeMediaBuffer(
  buffer: Buffer,
  label = "上傳內容",
  mimeType = "image/webp",
): Promise<void> {
  const result = await checkImageSafety({ buffer, mimeType });
  if (!result.isSafe) {
    throw new Error(
      `${label}未通過內容安全審查（偵測到成人色情或不當內容：${result.reason || result.category}），已被系統攔截拒絕處理。`,
    );
  }
}

/**
 * Asserts that an image URL does not contain NSFW/adult material.
 * Throws an Error if content violates the safety policy.
 */
export async function assertSafeMediaUrl(url: string, label = "參考圖片"): Promise<void> {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) return;
  const result = await checkImageSafety({ url });
  if (!result.isSafe) {
    throw new Error(
      `${label}未通過內容安全審查（偵測到成人色情或不當內容：${result.reason || result.category}），已被系統攔截拒絕處理。`,
    );
  }
}
