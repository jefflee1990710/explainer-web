import type { AspectRatio } from "@/model/project";
import { isBrandAssetUrl } from "@/service/video-edit/edit-state";

export type TeleportStartInput = {
  sourceVideoUrl: string;
  aspectRatio?: AspectRatio;
  sectionStart?: number;
  sectionLength?: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
  keepSourceAudio?: boolean;
  applyColorFix?: boolean;
  targetVideoId?: string;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
};

const VALID_RATIOS = new Set<AspectRatio>(["9:16", "16:9", "1:1"]);

export function normalizeTeleportStart(input: TeleportStartInput) {
  const sourceVideoUrl = input.sourceVideoUrl.trim();
  const sceneImageUrl = input.sceneImageUrl?.trim() || undefined;
  const scenePrompt = input.scenePrompt?.trim() || undefined;
  if (!sceneImageUrl && !scenePrompt) {
    return { ok: false as const, error: "請上傳場景照或寫下場景" };
  }
  const aspectRatio: AspectRatio =
    input.aspectRatio && VALID_RATIOS.has(input.aspectRatio) ? input.aspectRatio : "9:16";
  const sectionStart = Math.max(0, Number(input.sectionStart) || 0);
  const sectionLength = Math.min(15, Math.max(2, Number(input.sectionLength) || 6));
  const targetVideoId = input.targetVideoId?.trim() || undefined;
  const targetClipNumber =
    typeof input.targetClipNumber === "number" &&
    Number.isInteger(input.targetClipNumber) &&
    input.targetClipNumber > 0
      ? input.targetClipNumber
      : undefined;
  const previousClipVideoUrl = input.previousClipVideoUrl?.trim() || undefined;
  return {
    ok: true as const,
    sourceVideoUrl,
    aspectRatio,
    sectionStart,
    sectionLength,
    sceneImageUrl,
    scenePrompt,
    keepSourceAudio: input.keepSourceAudio !== false,
    applyColorFix: input.applyColorFix !== false,
    targetVideoId,
    targetClipNumber,
    previousClipVideoUrl,
  };
}

/** Same allowlist as `startScroSwapJob`: https, and when a store host exists, brand folder or any public blob host. */
export function isAllowedTeleportMediaUrl(
  url: string,
  clerkUserId: string,
  storeHost: string | null,
): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;
  if (!storeHost) return true;
  if (isBrandAssetUrl(trimmed, clerkUserId, storeHost)) return true;
  return trimmed.includes(".public.blob.vercel-storage.com/");
}

export function teleportSubmitDurationSeconds(sectionLength: number): number {
  return Math.min(15, Math.max(5, Math.round(sectionLength)));
}
