// Finds background music and sound effects for the assistant's auto_bgm / auto_sfx tools.
// Reuses the OpenCut planners (Gemini mood + Freesound), then copies each file to Blob so
// canvas FFmpeg jobs can read it through the media URL guard. Nothing here bills the user.

import {
  planAutoBgmSelection,
  planAutoSfxInsertions,
  type TimelineTransitionCue,
  type TimelineVisualPopCue,
} from "@/service/opencut/auto-audio";
import type { LibrarySound } from "@/service/sound-effect/library-sound";
import { persistBuffer } from "@/service/higgsfield/persist";
import { isAllowedCanvasMediaUrl } from "@/service/canvas/execution/media-url-guard";

export type FoundSound = {
  url: string;
  name: string;
  durationSec: number;
  credit: string;
};

export type FoundMusic = FoundSound & { mood: string };
export type FoundSfx = FoundSound & { atSec: number; reason: string };

export type SmartAudioFinder = {
  findMusic: (input: { context: string; mood?: string }) => Promise<FoundMusic | null>;
  findSfx: (input: { transitions: TimelineTransitionCue[]; pops: TimelineVisualPopCue[]; max: number }) => Promise<FoundSfx[]>;
};

const MAX_SOUND_BYTES = 20 * 1024 * 1024;

// Library sounds may live on Freesound's CDN; a Blob copy keeps the canvas on allowed hosts.
async function toBlob(sound: LibrarySound): Promise<string> {
  if (isAllowedCanvasMediaUrl(sound.previewUrl)) return sound.previewUrl;
  const res = await fetch(sound.previewUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`無法下載音效（HTTP ${res.status}）`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_SOUND_BYTES) throw new Error("音樂檔太大");
  const safeId = sound.id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
  return persistBuffer(buf, `canvas/library-audio/${safeId}.mp3`, "audio/mpeg");
}

function credit(sound: LibrarySound): string {
  return [sound.username && `by ${sound.username}`, sound.license].filter(Boolean).join(" · ");
}

export const defaultSmartAudioFinder: SmartAudioFinder = {
  findMusic: async ({ context, mood }) => {
    const line = [mood ? `Mood: ${mood}.` : "", context].filter(Boolean).join(" ");
    const pick = await planAutoBgmSelection({ clips: [{ clipNumber: 1, line }] });
    if (!pick) return null;
    return {
      url: await toBlob(pick.sound),
      name: pick.sound.name,
      durationSec: pick.sound.duration,
      credit: credit(pick.sound),
      mood: pick.mood,
    };
  },
  findSfx: async ({ transitions, pops, max }) => {
    const planned = await planAutoSfxInsertions({ clips: [], transitions, visualPops: pops });
    const out: FoundSfx[] = [];
    for (const p of planned.slice(0, max)) {
      if (p.targetTimeSec === undefined) continue;
      const url = await toBlob(p.sound).catch(() => null);
      if (!url) continue;
      out.push({ url, name: p.sound.name, durationSec: p.sound.duration, credit: credit(p.sound), atSec: p.targetTimeSec, reason: p.reason });
    }
    return out;
  },
};
