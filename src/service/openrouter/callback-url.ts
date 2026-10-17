import { getAppUrl, isPublicHttpUrl } from "@/util/app-url";

// Kept out of webhook.ts so client bundles that import model ids from generate.ts
// do not pull in node:crypto.
export function openRouterVideoCallbackUrl(
  appUrl = getAppUrl(),
  secret = process.env.OPENROUTER_WEBHOOK_SECRET,
) {
  if (!(secret || "").trim()) return undefined;
  const url = `${appUrl.replace(/\/$/, "")}/api/webhooks/openrouter`;
  if (!isPublicHttpsUrl(url)) return undefined;
  return url;
}

function isPublicHttpsUrl(raw: string) {
  if (!isPublicHttpUrl(raw)) return false;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}
