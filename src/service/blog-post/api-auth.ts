import { timingSafeEqual } from "crypto";
import { authenticateApiRequest } from "@/service/api/auth";
import { authenticateApiKey } from "@/service/mcp/api-keys";

// Verify API key from `x-api-key` or `Authorization: Bearer <secret>` against POST_API_KEY,
// an `exp_live_*` MongoDB API key, or standard `/api/v1` user authentication.
export async function isAuthorizedPostAdmin(request: Request): Promise<boolean> {
  const configuredSecret = process.env.POST_API_KEY?.trim();
  const headerKey =
    request.headers.get("x-api-key")?.trim() ||
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7).trim()
      : "");

  if (configuredSecret && headerKey) {
    const a = Buffer.from(configuredSecret);
    const b = Buffer.from(headerKey);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true;
    }
  }

  // Support passing a never-expiring `exp_live_*` key via `x-api-key` as well as `Authorization: Bearer`.
  if (headerKey.startsWith("exp_live_")) {
    const keyAuth = await authenticateApiKey(`Bearer ${headerKey}`);
    if (keyAuth) return true;
  }

  const userAuth = await authenticateApiRequest(request);
  return Boolean(userAuth);
}

// Parse tags from either an array, JSON array string, or comma-separated string.
export function parsePostTags(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Treat as comma-separated string
    }
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}
