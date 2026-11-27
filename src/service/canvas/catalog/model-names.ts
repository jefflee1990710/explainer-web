// Localized display names for Scro Tool and FFmpeg canvas nodes. The catalog keeps
// one English `name` (also used by the canvas agent); the UI shows these per locale.
// OpenRouter model names are product names and stay as-is in every language.

import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import type { LocaleId } from "@/util/i18n/locales";

type LocalizedName = Partial<Record<LocaleId, string>>;

export const CANVAS_MODEL_LOCAL_NAMES: Record<string, LocalizedName> = {
  "scro:talking-head": {
    "zh-Hant": "口播導演",
    "zh-Hans": "口播导演",
    ja: "Talking Head Director",
    ko: "Talking Head Director",
  },
  "scro:explainer": {
    "zh-Hant": "Explainer 解說短片",
    "zh-Hans": "Explainer 解说短片",
    ja: "Explainer 解説動画",
    ko: "Explainer 설명 영상",
  },
  "scro:explainer-frame": {
    "zh-Hant": "Explainer 分鏡靜幀",
    "zh-Hans": "Explainer 分镜静帧",
    ja: "Explainer 絵コンテ静止画",
    ko: "Explainer 스토리보드 스틸",
  },
  "scro:director-frame": {
    "zh-Hant": "分鏡靜幀",
    "zh-Hans": "分镜静帧",
    ja: "絵コンテ静止画",
    ko: "스토리보드 스틸",
  },
  "scro:swap": {
    "zh-Hant": "換角導演",
    "zh-Hans": "换角导演",
    ja: "Scro Swap Director",
    ko: "Scro Swap Director",
  },
  "scro:teleport": {
    "zh-Hant": "換場導演",
    "zh-Hans": "换场导演",
    ja: "Teleport Director",
    ko: "Teleport Director",
  },
  "scro:swap-render": {
    "zh-Hant": "Scro Swap 換角渲染",
    "zh-Hans": "Scro Swap 换角渲染",
    ja: "Scro Swap 差し替えレンダー",
    ko: "Scro Swap 교체 렌더",
  },
  "scro:teleport-render": {
    "zh-Hant": "Teleport 換場渲染",
    "zh-Hans": "Teleport 换场渲染",
    ja: "Teleport 背景レンダー",
    ko: "Teleport 배경 렌더",
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
  "scro:style-transfer": {
    "zh-Hant": "風格轉換",
    "zh-Hans": "风格转换",
    ja: "スタイル変換",
    ko: "스타일 변환",
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
  "ffmpeg:color-grade": {
    "zh-Hant": "FFmpeg 調色",
    "zh-Hans": "FFmpeg 调色",
    ja: "FFmpeg カラーグレード",
    ko: "FFmpeg 색보정",
  },
  "ffmpeg:smooth-silence": {
    "zh-Hant": "FFmpeg 靜音修剪",
    "zh-Hans": "FFmpeg 静音修剪",
    ja: "FFmpeg 無音カット",
    ko: "FFmpeg 무음 다듬기",
  },
  "scro:auto-captions": {
    "zh-Hant": "自動字幕",
    "zh-Hans": "自动字幕",
    ja: "自動字幕",
    ko: "자동 자막",
  },
  "ffmpeg:keep-ranges": {
    "zh-Hant": "FFmpeg 保留區間",
    "zh-Hans": "FFmpeg 保留区间",
    ja: "FFmpeg 区間キープ",
    ko: "FFmpeg 구간 유지",
  },
  "ffmpeg:volume": {
    "zh-Hant": "FFmpeg 音量",
    "zh-Hans": "FFmpeg 音量",
    ja: "FFmpeg 音量",
    ko: "FFmpeg 음량",
  },
  "ffmpeg:audio-fade": {
    "zh-Hant": "FFmpeg 音訊淡化",
    "zh-Hans": "FFmpeg 音频淡化",
    ja: "FFmpeg 音声フェード",
    ko: "FFmpeg 오디오 페이드",
  },
  "ffmpeg:fade": {
    "zh-Hant": "FFmpeg 淡入淡出",
    "zh-Hans": "FFmpeg 淡入淡出",
    ja: "FFmpeg フェード",
    ko: "FFmpeg 페이드",
  },
  "ffmpeg:crop": {
    "zh-Hant": "FFmpeg 裁切",
    "zh-Hans": "FFmpeg 裁切",
    ja: "FFmpeg クロップ",
    ko: "FFmpeg 자르기",
  },
  "ffmpeg:rotate": {
    "zh-Hant": "FFmpeg 旋轉",
    "zh-Hans": "FFmpeg 旋转",
    ja: "FFmpeg 回転",
    ko: "FFmpeg 회전",
  },
  "ffmpeg:overlay": {
    "zh-Hant": "FFmpeg 疊加",
    "zh-Hans": "FFmpeg 叠加",
    ja: "FFmpeg オーバーレイ",
    ko: "FFmpeg 오버레이",
  },
  "ffmpeg:image-to-video": {
    "zh-Hant": "FFmpeg 圖片轉影片",
    "zh-Hans": "FFmpeg 图片转视频",
    ja: "FFmpeg 画像から動画",
    ko: "FFmpeg 이미지를 영상으로",
  },
  "ffmpeg:frame-grab": {
    "zh-Hant": "FFmpeg 截圖",
    "zh-Hans": "FFmpeg 截图",
    ja: "FFmpeg フレーム抽出",
    ko: "FFmpeg 프레임 추출",
  },
  "ffmpeg:burn-subtitles": {
    "zh-Hant": "FFmpeg 燒錄字幕",
    "zh-Hans": "FFmpeg 烧录字幕",
    ja: "FFmpeg 字幕焼き込み",
    ko: "FFmpeg 자막 굽기",
  },
};

// Name to show for a canvas node in the given UI locale; falls back to the English catalog name.
export function canvasModelDisplayName(spec: Pick<CanvasModelSpec, "id" | "name">, locale: string): string {
  return CANVAS_MODEL_LOCAL_NAMES[spec.id]?.[locale as LocaleId] ?? spec.name;
}
