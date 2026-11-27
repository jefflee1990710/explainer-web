"use client";

// Timeline header action: find the music's beats (once, stored on the audio item) and move every
// cut onto the nearest beat.

import { useState } from "react";
import { Loader2, Music2 } from "lucide-react";
import { toast } from "sonner";
import type { CanvasSequence } from "@/model/canvas-sequence";
import { analyzeCanvasBeatsAction } from "@/presentation/actions/canvas-beats";
import { snapClipsToBeats, type SequenceDurations } from "@/service/canvas/core/sequence";
import type { SequenceSource } from "@/app/app/canvas/timeline/use-sequence-sources";

export function BeatSyncButton({
  seq,
  sources,
  durations,
  isZh,
  onChange,
}: {
  seq: CanvasSequence;
  sources: Record<string, SequenceSource>;
  durations: SequenceDurations;
  isZh: boolean;
  onChange: (next: CanvasSequence) => void;
}) {
  const [busy, setBusy] = useState(false);
  const t = (zh: string, en: string) => (isZh ? zh : en);
  // The music: an item that already has beats, else the first audio item with a file.
  const music =
    seq.tracks.audio.find((a) => a.beats?.length) ?? seq.tracks.audio.find((a) => sources[a.ref]?.url);
  const disabled = busy || !music || seq.tracks.video.length === 0;

  const run = async () => {
    if (!music) return;
    setBusy(true);
    try {
      let current = seq;
      if (!music.beats?.length) {
        const res = await analyzeCanvasBeatsAction(sources[music.ref]!.url!);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        current = {
          ...seq,
          tracks: {
            ...seq.tracks,
            audio: seq.tracks.audio.map((a) => (a.id === music.id ? { ...a, bpm: res.bpm, beats: res.beats } : a)),
          },
        };
      }
      const { seq: snapped, moved } = snapClipsToBeats(current, durations, music.id);
      onChange(snapped);
      const bpm = current.tracks.audio.find((a) => a.id === music.id)?.bpm ?? 0;
      toast.success(t(`${bpm} BPM，已對齊 ${moved} 個剪接點`, `${bpm} BPM, moved ${moved} cut(s) onto beats`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={disabled}
      title={music ? t("把每個剪接點移到最近的節拍", "Move every cut onto the nearest beat") : t("先連一首音樂到「音訊」輸入", "Wire music into the Audio input first")}
      className="flex cursor-pointer items-center gap-1 rounded-[8px] border border-white/12 bg-white/6 px-2 py-1 text-[11px] text-white/85 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Music2 className="h-3 w-3" />}
      {t("對齊節拍", "Snap to beats")}
    </button>
  );
}
