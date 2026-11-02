import { isBrandAssetUrl } from "@/service/video-edit/edit-state";

export type TeleportStartInput = {
  sourceVideoUrl: string;
  sectionStart?: number;
  sectionLength?: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
  keepSourceAudio?: boolean;
  applyColorFix?: boolean;
};

export function normalizeTeleportStart(input: TeleportStartInput) {
  const sourceVideoUrl = input.sourceVideoUrl.trim();
  const sceneImageUrl = input.sceneImageUrl?.trim() || undefined;
  const scenePrompt = input.scenePrompt?.trim() || undefined;
  if (!sceneImageUrl && !scenePrompt) {
    return { ok: false as const, error: "請上傳場景照或寫下場景" };
  }
  const sectionStart = Math.max(0, Number(input.sectionStart) || 0);
  const sectionLength = Math.min(15, Math.max(2, Number(input.sectionLength) || 6));
  return {
    ok: true as const,
    sourceVideoUrl,
    sectionStart,
    sectionLength,
    sceneImageUrl,
    scenePrompt,
    keepSourceAudio: input.keepSourceAudio !== false,
    applyColorFix: input.applyColorFix !== false,
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
