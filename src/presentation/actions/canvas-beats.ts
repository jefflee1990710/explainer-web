"use server";

// Sequence "Snap to beats": finds the beat grid of a music file wired into a timeline.

import { requireAppUser } from "@/service/auth";
import { analyzeAudioBeats } from "@/service/canvas/execution/beat-analysis";

export async function analyzeCanvasBeatsAction(
  url: string,
): Promise<{ ok: true; bpm: number; beats: number[] } | { ok: false; error: string }> {
  await requireAppUser();
  try {
    const grid = await analyzeAudioBeats(url);
    if (!grid.beats.length) return { ok: false, error: "找不到節拍，請換一首節奏較明顯的音樂" };
    return { ok: true, ...grid };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "分析節拍失敗" };
  }
}
