// Controls for the canvas edit nodes: ranges, sound, crop, overlay, stills, and burned subtitles.

import type { ReactNode } from "react";

const fieldClass =
  "nodrag rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90";

type Props = {
  modelId: string;
  isZh: boolean;
  toolParams: Record<string, unknown>;
  onToolParam: (key: string, value: unknown) => void;
  prompt?: string;
  promptWired?: boolean;
  onPrompt?: (prompt: string) => void;
};

function Label({ children }: { children: ReactNode }) {
  return <label className="text-[10px] text-white/50">{children}</label>;
}

export function FfmpegEditFields({
  modelId,
  isZh,
  toolParams,
  onToolParam,
  prompt,
  promptWired,
  onPrompt,
}: Props) {
  if (modelId === "ffmpeg:keep-ranges") {
    return (
      <div className="flex flex-col gap-1">
        <Label>{isZh ? "保留區間（秒）" : "Keep ranges (seconds)"}</Label>
        <input
          value={String(toolParams.ffmpegRanges ?? "")}
          onChange={(e) => onToolParam("ffmpegRanges", e.target.value)}
          placeholder="0-3, 8-12"
          className={fieldClass}
        />
      </div>
    );
  }

  if (modelId === "ffmpeg:volume") {
    const mode = String(toolParams.ffmpegVolumeMode ?? "gain");
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col gap-1">
          <Label>{isZh ? "模式" : "Mode"}</Label>
          <select
            value={mode}
            onChange={(e) => onToolParam("ffmpegVolumeMode", e.target.value)}
            className={`${fieldClass} cursor-pointer`}
          >
            <option value="gain">{isZh ? "增益" : "Gain"}</option>
            <option value="mute">{isZh ? "靜音" : "Mute"}</option>
            <option value="loudnorm">{isZh ? "響度標準" : "Loudness"}</option>
          </select>
        </div>
        {mode === "gain" ? (
          <div className="flex flex-col gap-1">
            <Label>
              {isZh ? "音量" : "Gain"} ({Number(toolParams.ffmpegAudioGainDb ?? 0)}dB)
            </Label>
            <input
              type="number"
              min={-40}
              max={24}
              value={Number(toolParams.ffmpegAudioGainDb ?? 0)}
              onChange={(e) => onToolParam("ffmpegAudioGainDb", Number(e.target.value))}
              className={fieldClass}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (modelId === "ffmpeg:audio-fade" || modelId === "ffmpeg:fade") {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col gap-1">
          <Label>{isZh ? "淡入（秒）" : "Fade in (s)"}</Label>
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={Number(toolParams.ffmpegFadeInSec ?? 0.4)}
            onChange={(e) => onToolParam("ffmpegFadeInSec", Number(e.target.value))}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>{isZh ? "淡出（秒）" : "Fade out (s)"}</Label>
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={Number(toolParams.ffmpegFadeOutSec ?? 0.4)}
            onChange={(e) => onToolParam("ffmpegFadeOutSec", Number(e.target.value))}
            className={fieldClass}
          />
        </div>
      </div>
    );
  }

  if (modelId === "ffmpeg:crop") {
    const mode = String(toolParams.ffmpegCropMode ?? "custom");
    return (
      <div className="space-y-1.5">
        <select
          value={mode}
          onChange={(e) => onToolParam("ffmpegCropMode", e.target.value)}
          className={`${fieldClass} w-full cursor-pointer`}
        >
          <option value="custom">{isZh ? "自訂寬高" : "Custom"}</option>
          <option value="letterbox">{isZh ? "去掉上下黑邊" : "Remove letterbox"}</option>
        </select>
        {mode === "custom" ? (
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                ["ffmpegCropX", "X"],
                ["ffmpegCropY", "Y"],
                ["ffmpegCropW", "W"],
                ["ffmpegCropH", "H"],
              ] as const
            ).map(([key, label]) => (
              <input
                key={key}
                type="number"
                min={0}
                value={toolParams[key] !== undefined ? Number(toolParams[key]) : ""}
                placeholder={label}
                onChange={(e) =>
                  onToolParam(key, e.target.value === "" ? undefined : Number(e.target.value))
                }
                className={fieldClass}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (modelId === "ffmpeg:rotate") {
    return (
      <select
        value={String(toolParams.ffmpegRotate ?? "90")}
        onChange={(e) => onToolParam("ffmpegRotate", e.target.value)}
        className={`${fieldClass} w-full cursor-pointer`}
      >
        <option value="90">90°</option>
        <option value="180">180°</option>
        <option value="270">270°</option>
      </select>
    );
  }

  if (modelId === "ffmpeg:overlay") {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col gap-1">
          <Label>{isZh ? "位置" : "Position"}</Label>
          <select
            value={String(toolParams.ffmpegOverlayPosition ?? "bottom-right")}
            onChange={(e) => onToolParam("ffmpegOverlayPosition", e.target.value)}
            className={`${fieldClass} cursor-pointer`}
          >
            <option value="top-left">{isZh ? "左上" : "Top left"}</option>
            <option value="top-right">{isZh ? "右上" : "Top right"}</option>
            <option value="bottom-left">{isZh ? "左下" : "Bottom left"}</option>
            <option value="bottom-right">{isZh ? "右下" : "Bottom right"}</option>
            <option value="center">{isZh ? "置中" : "Center"}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>
            {isZh ? "透明度" : "Opacity"} ({Number(toolParams.ffmpegOverlayOpacity ?? 1)})
          </Label>
          <input
            type="number"
            min={0.05}
            max={1}
            step={0.05}
            value={Number(toolParams.ffmpegOverlayOpacity ?? 1)}
            onChange={(e) => onToolParam("ffmpegOverlayOpacity", Number(e.target.value))}
            className={fieldClass}
          />
        </div>
      </div>
    );
  }

  if (modelId === "ffmpeg:image-to-video") {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col gap-1">
          <Label>{isZh ? "秒數" : "Seconds"}</Label>
          <input
            type="number"
            min={1}
            max={30}
            value={Number(toolParams.ffmpegDurationSec ?? 3)}
            onChange={(e) => onToolParam("ffmpegDurationSec", Number(e.target.value))}
            className={fieldClass}
          />
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/70">
          <input
            type="checkbox"
            checked={Boolean(toolParams.ffmpegKenBurns)}
            onChange={(e) => onToolParam("ffmpegKenBurns", e.target.checked)}
            className="nodrag accent-[#c6f24b]"
          />
          {isZh ? "緩慢推鏡" : "Slow push"}
        </label>
      </div>
    );
  }

  if (modelId === "ffmpeg:frame-grab") {
    return (
      <div className="flex flex-col gap-1">
        <Label>{isZh ? "時間點（秒）" : "Time (seconds)"}</Label>
        <input
          type="number"
          min={0}
          step={0.1}
          value={Number(toolParams.ffmpegAtSec ?? 0)}
          onChange={(e) => onToolParam("ffmpegAtSec", Number(e.target.value))}
          className={fieldClass}
        />
      </div>
    );
  }

  if (modelId === "ffmpeg:burn-subtitles") {
    return (
      <div className="flex flex-col gap-1">
        <Label>{isZh ? "字幕稿（沒有連線時使用）" : "Subtitle text (used when unwired)"}</Label>
        <textarea
          value={promptWired ? "" : (prompt ?? "")}
          disabled={promptWired}
          onChange={(e) => onPrompt?.(e.target.value)}
          placeholder={promptWired ? (isZh ? "使用連線的字幕稿" : "Using the wired subtitle") : "1\n00:00:00,000 --> 00:00:02,000\n你好"}
          rows={4}
          className={`${fieldClass} resize-y disabled:opacity-50`}
        />
      </div>
    );
  }

  return null;
}
