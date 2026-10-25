import type { LibrarySound } from "@/service/sound-effect/library-sound";

export type { LibrarySound };

export type PlannedSfxInsertion = {
  clipNumber: number;
  query: string;
  reason: string;
  beat: "start" | "mid" | "end";
  sound: LibrarySound;
};

export type PlannedBgmSelection = {
  mood: string;
  englishSearchQuery: string;
  reason: string;
  sound: LibrarySound;
};

/** Resolve when an SFX should start inside a clip window. */
export function computeSfxStartSeconds({
  clipStartSec,
  clipDurSec,
  beat,
}: {
  clipStartSec: number;
  clipDurSec: number;
  beat: "start" | "mid" | "end";
}) {
  if (beat === "start") return Math.round(clipStartSec * 100) / 100;
  if (beat === "end") {
    return Math.round(Math.max(clipStartSec, clipStartSec + clipDurSec - 0.45) * 100) / 100;
  }
  return Math.round((clipStartSec + clipDurSec * 0.42) * 100) / 100;
}

export const AI_SFX_NAME_PREFIX = "SFX";
export const AI_BGM_NAME_PREFIX = "BGM";
/** Short Foley hits — a bit under speech (0 dB = unity). */
export const AI_SFX_VOLUME_DB = -6;
/** Underscore bed — audible under VO, still quieter than speech and SFX. */
export const AI_BGM_VOLUME_DB = -8;

export function isAiSfxElementName(name: string) {
  return /^SFX\b/i.test(name.trim());
}

export function isAiBgmElementName(name: string) {
  return /^BGM\b/i.test(name.trim());
}
