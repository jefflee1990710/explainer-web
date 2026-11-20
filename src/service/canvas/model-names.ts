// Localized display names for Scro Tool and FFmpeg canvas nodes. The catalog keeps
// one English `name` (also used by the canvas agent); the UI shows these per locale.
// OpenRouter model names are product names and stay as-is in every language.

import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import type { LocaleId } from "@/util/i18n/locales";

type LocalizedName = Partial<Record<LocaleId, string>>;

export const CANVAS_MODEL_LOCAL_NAMES: Record<string, LocalizedName> = {
  "scro:talking-head": {
    "zh-Hant": "Talking Head 口播",
    "zh-Hans": "Talking Head 口播",
    ja: "Talking Head トーク動画",
    ko: "Talking Head 토킹 영상",
  },
  "scro:explainer": {
    "zh-Hant": "Explainer 解說短片",
    "zh-Hans": "Explainer 解说短片",
    ja: "Explainer 解説動画",
    ko: "Explainer 설명 영상",
  },
  "scro:swap": {
    "zh-Hant": "Scro Swap 換角",
    "zh-Hans": "Scro Swap 换角",
    ja: "Scro Swap キャラ差し替え",
    ko: "Scro Swap 캐릭터 교체",
  },
  "scro:teleport": {
    "zh-Hant": "Teleport 實景換場",
    "zh-Hans": "Teleport 实景换场",
    ja: "Teleport 背景チェンジ",
    ko: "Teleport 배경 전환",
  },
  "scro:life": {
    "zh-Hant": "Life 生活照",
    "zh-Hans": "Life 生活照",
    ja: "Life ライフ写真",
    ko: "Life 라이프 사진",
  },
  "scro:poster": {
    "zh-Hant": "Poster 海報貼文",
    "zh-Hans": "Poster 海报贴文",
    ja: "Poster ポスター投稿",
    ko: "Poster 포스터 게시물",
  },
  "scro:tts": {
    "zh-Hant": "ElevenLabs TTS 配音",
    "zh-Hans": "ElevenLabs TTS 配音",
    ja: "ElevenLabs TTS 音声合成",
    ko: "ElevenLabs TTS 음성 합성",
  },
  "ffmpeg:concat": {
    "zh-Hant": "FFmpeg 合併串接",
    "zh-Hans": "FFmpeg 合并串接",
    ja: "FFmpeg 動画結合",
    ko: "FFmpeg 영상 이어붙이기",
  },
  "ffmpeg:audio-mux": {
    "zh-Hant": "FFmpeg 音畫合成",
    "zh-Hans": "FFmpeg 音画合成",
    ja: "FFmpeg 音声合成",
    ko: "FFmpeg 오디오 합성",
  },
  "ffmpeg:trim-speed": {
    "zh-Hant": "FFmpeg 裁剪變速",
    "zh-Hans": "FFmpeg 裁剪变速",
    ja: "FFmpeg トリム・速度",
    ko: "FFmpeg 자르기·속도",
  },
  "ffmpeg:transform": {
    "zh-Hant": "FFmpeg 比例／調色",
    "zh-Hans": "FFmpeg 比例／调色",
    ja: "FFmpeg 比率・色調整",
    ko: "FFmpeg 비율·색보정",
  },
  "ffmpeg:extract-audio": {
    "zh-Hant": "FFmpeg 抽離音訊",
    "zh-Hans": "FFmpeg 提取音频",
    ja: "FFmpeg 音声抽出",
    ko: "FFmpeg 오디오 추출",
  },
};

// Name to show for a canvas node in the given UI locale; falls back to the English catalog name.
export function canvasModelDisplayName(spec: Pick<CanvasModelSpec, "id" | "name">, locale: string): string {
  return CANVAS_MODEL_LOCAL_NAMES[spec.id]?.[locale as LocaleId] ?? spec.name;
}
