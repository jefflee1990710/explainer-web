"use client";

// Right panel of the timeline drawer: fields for the selected clip, layer, or audio item, or
// the sequence's own settings and captions when nothing is selected.

import { Trash2 } from "lucide-react";
import {
  SEQUENCE_ASPECTS,
  SEQUENCE_RESOLUTIONS,
  SEQUENCE_TEXT_COLORS,
  SEQUENCE_TRANSITIONS,
  type CanvasSequence,
  type SequenceTransition,
} from "@/model/canvas-sequence";
import type { SubtitleLook } from "@/model/subtitle-look-id";
import { SUBTITLE_LOOK_OPTIONS } from "@/app/app/canvas/nodes/ffmpeg-param-field-table";
import { NumField, SelectField, TextAreaField, ToggleField } from "@/app/app/canvas/timeline/sequence-fields";
import {
  patchAudio,
  patchClip,
  patchLayer,
  type SequenceSelection,
} from "@/app/app/canvas/timeline/sequence-timeline-model";
import type { SequenceSource } from "@/app/app/canvas/timeline/use-sequence-sources";

const TRANSITION_LABELS: Record<SequenceTransition, [string, string]> = {
  cut: ["硬切", "Cut"],
  fade: ["淡入淡出", "Crossfade"],
  dissolve: ["溶解", "Dissolve"],
  wipeleft: ["向左擦除", "Wipe left"],
  wiperight: ["向右擦除", "Wipe right"],
  slideleft: ["向左滑動", "Slide left"],
  slideright: ["向右滑動", "Slide right"],
};

const COLOR_LABELS: Record<string, [string, string]> = {
  white: ["白", "White"],
  yellow: ["黃", "Yellow"],
  black: ["黑", "Black"],
  lime: ["螢光綠", "Lime"],
  red: ["紅", "Red"],
};

export function SequenceInspector({
  seq,
  selection,
  sources,
  isZh,
  captionsText,
  captionsWired,
  onChange,
  onCaptionsText,
  onRemove,
}: {
  seq: CanvasSequence;
  selection: SequenceSelection;
  sources: Record<string, SequenceSource>;
  isZh: boolean;
  captionsText: string;
  captionsWired: boolean;
  onChange: (next: CanvasSequence) => void;
  onCaptionsText: (text: string) => void;
  onRemove: () => void;
}) {
  const t = (zh: string, en: string) => (isZh ? zh : en);
  const removeButton = (
    <button
      type="button"
      onClick={onRemove}
      className="mt-1 flex cursor-pointer items-center justify-center gap-1 rounded-[8px] border border-red-400/30 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
    >
      <Trash2 className="h-3 w-3" />
      {t("從時間線移除", "Remove from timeline")}
    </button>
  );

  const clipIndex = selection?.kind === "clip" ? seq.tracks.video.findIndex((c) => c.id === selection.id) : -1;
  const clip = clipIndex >= 0 ? seq.tracks.video[clipIndex] : undefined;
  if (clip) {
    const src = sources[clip.ref];
    const effect = clip.transitionIn?.effect ?? "cut";
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 truncate text-[11px] font-semibold text-white/85">
          {clipIndex + 1}. {src?.label ?? "?"}
          {src?.durationSec !== undefined ? <span className="font-normal text-white/40"> · {src.durationSec.toFixed(1)}s</span> : null}
        </div>
        <NumField label={t("入點 (秒)", "In (s)")} value={clip.inSec} min={0} max={src?.durationSec} onChange={(v) => onChange(patchClip(seq, clip.id, { inSec: v ?? 0 }))} />
        <NumField
          label={t("出點 (秒)", "Out (s)")}
          value={clip.outSec}
          min={0}
          max={src?.durationSec}
          placeholder={t("到結尾", "to end")}
          onChange={(v) => onChange(patchClip(seq, clip.id, { outSec: v }))}
        />
        <NumField label={t("速度", "Speed")} value={clip.speed} min={0.25} max={4} step={0.25} onChange={(v) => onChange(patchClip(seq, clip.id, { speed: v ?? 1 }))} />
        <div className="flex items-end pb-1">
          <ToggleField label={t("靜音", "Mute")} value={Boolean(clip.muted)} onChange={(muted) => onChange(patchClip(seq, clip.id, { muted }))} />
        </div>
        {clipIndex > 0 ? (
          <>
            <SelectField
              label={t("進場轉場", "Transition in")}
              value={effect}
              options={SEQUENCE_TRANSITIONS.map((v) => ({ value: v, label: t(...TRANSITION_LABELS[v]) }))}
              onChange={(v) =>
                onChange(
                  patchClip(seq, clip.id, {
                    transitionIn: v === "cut" ? undefined : { effect: v, durationSec: clip.transitionIn?.durationSec ?? 0.5 },
                  }),
                )
              }
            />
            {effect !== "cut" ? (
              <NumField
                label={t("轉場長度 (秒)", "Length (s)")}
                value={clip.transitionIn?.durationSec ?? 0.5}
                min={0.1}
                max={2}
                onChange={(v) => onChange(patchClip(seq, clip.id, { transitionIn: { effect, durationSec: v ?? 0.5 } }))}
              />
            ) : null}
          </>
        ) : null}
        <div className="col-span-2">{removeButton}</div>
      </div>
    );
  }

  const layer = selection?.kind === "layer" ? seq.tracks.overlay.find((l) => l.id === selection.id) : undefined;
  if (layer) {
    const set = (patch: Parameters<typeof patchLayer>[2]) => onChange(patchLayer(seq, layer.id, patch));
    return (
      <div className="grid grid-cols-2 gap-2">
        {layer.kind === "text" ? (
          <div className="col-span-2">
            <TextAreaField label={t("文字", "Text")} value={layer.text ?? ""} rows={2} onChange={(text) => set({ text })} />
          </div>
        ) : (
          <div className="col-span-2 truncate text-[11px] font-semibold text-white/85">{layer.ref ? sources[layer.ref]?.label : "?"}</div>
        )}
        <NumField label={t("開始 (秒)", "Start (s)")} value={layer.startSec} min={0} onChange={(v) => set({ startSec: v ?? 0 })} />
        <NumField label={t("結束 (秒)", "End (s)")} value={layer.endSec} min={0} placeholder={t("到結尾", "to end")} onChange={(v) => set({ endSec: v })} />
        {layer.kind === "text" ? (
          <>
            <SelectField
              label={t("位置", "Position")}
              value={layer.position}
              options={[
                { value: "top", label: t("上方", "Top") },
                { value: "center", label: t("中間", "Center") },
                { value: "bottom", label: t("下方", "Bottom") },
              ]}
              onChange={(position) => set({ position })}
            />
            <NumField label={t("字級 (% 高度)", "Size (% height)")} value={layer.sizePct} min={2} max={15} step={0.5} onChange={(v) => set({ sizePct: v ?? 5 })} />
            <SelectField
              label={t("顏色", "Color")}
              value={layer.color}
              options={SEQUENCE_TEXT_COLORS.map((c) => ({ value: c, label: t(...(COLOR_LABELS[c] ?? [c, c])) }))}
              onChange={(color) => set({ color })}
            />
            <div className="flex items-end pb-1">
              <ToggleField label={t("底框", "Box")} value={layer.box} onChange={(box) => set({ box })} />
            </div>
          </>
        ) : (
          <>
            <NumField label={t("左 (%)", "Left (%)")} value={layer.x} min={0} max={100} step={1} onChange={(v) => set({ x: v ?? 0 })} />
            <NumField label={t("上 (%)", "Top (%)")} value={layer.y} min={0} max={100} step={1} onChange={(v) => set({ y: v ?? 0 })} />
            <NumField label={t("寬度 (%)", "Width (%)")} value={layer.scalePct} min={5} max={100} step={1} onChange={(v) => set({ scalePct: v ?? 25 })} />
            <NumField label={t("不透明度", "Opacity")} value={layer.opacity} min={0.05} max={1} step={0.05} onChange={(v) => set({ opacity: v ?? 1 })} />
          </>
        )}
        <div className="col-span-2">{removeButton}</div>
      </div>
    );
  }

  const audio = selection?.kind === "audio" ? seq.tracks.audio.find((a) => a.id === selection.id) : undefined;
  if (audio) {
    const set = (patch: Parameters<typeof patchAudio>[2]) => onChange(patchAudio(seq, audio.id, patch));
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 truncate text-[11px] font-semibold text-white/85">{sources[audio.ref]?.label ?? "?"}</div>
        <NumField label={t("時間線開始 (秒)", "Starts at (s)")} value={audio.startSec} min={0} onChange={(v) => set({ startSec: v ?? 0 })} />
        <NumField label={t("音量 (dB)", "Gain (dB)")} value={audio.gainDb} min={-40} max={12} step={1} onChange={(v) => set({ gainDb: v ?? 0 })} />
        <NumField label={t("入點 (秒)", "In (s)")} value={audio.inSec} min={0} onChange={(v) => set({ inSec: v ?? 0 })} />
        <NumField label={t("出點 (秒)", "Out (s)")} value={audio.outSec} min={0} placeholder={t("到結尾", "to end")} onChange={(v) => set({ outSec: v })} />
        <NumField label={t("淡入 (秒)", "Fade in (s)")} value={audio.fadeInSec} min={0} max={10} onChange={(v) => set({ fadeInSec: v ?? 0 })} />
        <NumField label={t("淡出 (秒)", "Fade out (s)")} value={audio.fadeOutSec} min={0} max={10} onChange={(v) => set({ fadeOutSec: v ?? 0 })} />
        <ToggleField label={t("人聲時自動壓低", "Duck under speech")} value={audio.duck} onChange={(duck) => set({ duck })} />
        <ToggleField label={t("循環到結尾", "Loop to end")} value={audio.loop} onChange={(loop) => set({ loop })} />
        <div className="col-span-2">{removeButton}</div>
      </div>
    );
  }

  const captions = seq.tracks.captions;
  return (
    <div className="grid grid-cols-2 gap-2">
      <SelectField
        label={t("畫面比例", "Aspect")}
        value={seq.aspectRatio}
        options={SEQUENCE_ASPECTS.map((v) => ({ value: v, label: v }))}
        onChange={(aspectRatio) => onChange({ ...seq, aspectRatio })}
      />
      <SelectField
        label={t("解像度", "Resolution")}
        value={seq.resolution}
        options={SEQUENCE_RESOLUTIONS.map((v) => ({ value: v, label: v === "4k" ? "4K" : v }))}
        onChange={(resolution) => onChange({ ...seq, resolution })}
      />
      <SelectField
        label={t("影格率", "Frame rate")}
        value={String(seq.fps) as "24" | "30" | "60"}
        options={[
          { value: "24", label: "24 fps" },
          { value: "30", label: "30 fps" },
          { value: "60", label: "60 fps" },
        ]}
        onChange={(v) => onChange({ ...seq, fps: Number(v) as 24 | 30 | 60 })}
      />
      <SelectField
        label={t("字幕樣式", "Caption look")}
        value={(captions?.look ?? "clean") as SubtitleLook}
        options={SUBTITLE_LOOK_OPTIONS.map(([value, zh, en]) => ({ value: value as SubtitleLook, label: t(zh, en) }))}
        onChange={(look) => onChange({ ...seq, tracks: { ...seq.tracks, captions: { position: captions?.position ?? "bottom", look } } })}
      />
      <SelectField
        label={t("字幕位置", "Caption position")}
        value={captions?.position ?? "bottom"}
        options={[
          { value: "bottom", label: t("下方", "Bottom") },
          { value: "middle", label: t("中間", "Middle") },
          { value: "top", label: t("上方", "Top") },
        ]}
        onChange={(position) => onChange({ ...seq, tracks: { ...seq.tracks, captions: { look: captions?.look ?? "clean", position } } })}
      />
      <div className="col-span-2">
        {captionsWired ? (
          <p className="rounded-[8px] border border-[#c6f24b]/30 bg-[#c6f24b]/8 px-2 py-1.5 text-[10.5px] text-[#c6f24b]">
            {t("字幕由連接的 SRT 節點提供", "Captions come from the wired SRT node")}
          </p>
        ) : (
          <TextAreaField
            label={t("字幕 (SRT，可留空)", "Captions (SRT, optional)")}
            value={captionsText}
            rows={3}
            placeholder={"1\n00:00:00,000 --> 00:00:02,000\n…"}
            onChange={onCaptionsText}
          />
        )}
      </div>
      <p className="col-span-2 text-[10px] leading-relaxed text-white/40">
        {t(
          "選取片段、文字或音訊以編輯。把影片、圖片或音訊連到這個節點，就會加到時間線末端。",
          "Select a clip, layer, or audio item to edit it. Wire more video, images, or audio into this node to add them at the end.",
        )}
      </p>
    </div>
  );
}
