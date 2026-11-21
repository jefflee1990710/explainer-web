"use client";

// Asks for the Explainer topic and settings before a free storyboard plan starts.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import type { CanvasAspectRatio } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";

export type ExplainerPlanDialogValues = {
  topic: string;
  skillSlug: string;
  language: "yue" | "zh" | "en";
  durationPreset: "15s" | "30s" | "45s" | "60s";
  aspectRatio: CanvasAspectRatio;
  characterId?: string;
};

type Props = {
  open: boolean;
  isZh: boolean;
  defaultTopic?: string;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  onCancel: () => void;
  onSubmit: (values: ExplainerPlanDialogValues) => void;
};

const FIELD =
  "nodrag w-full cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1.5 text-[12px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none";

export function ExplainerPlanDialog({
  open,
  isZh,
  defaultTopic,
  characterOptions,
  onCancel,
  onSubmit,
}: Props) {
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [skillSlug, setSkillSlug] = useState("cartoon-explainer-video-director");
  const [language, setLanguage] = useState<ExplainerPlanDialogValues["language"]>("yue");
  const [durationPreset, setDurationPreset] =
    useState<ExplainerPlanDialogValues["durationPreset"]>("30s");
  const [aspectRatio, setAspectRatio] = useState<CanvasAspectRatio>("9:16");
  const [characterId, setCharacterId] = useState("");

  // Each open starts from the caller's topic (empty for sidebar drops, sample text for the template).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the dialog reopens
    if (open) setTopic(defaultTopic ?? "");
  }, [open, defaultTopic]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  const canSubmit = topic.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      topic: topic.trim(),
      skillSlug,
      language,
      durationPreset,
      aspectRatio,
      ...(characterId ? { characterId } : {}),
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] max-w-full rounded-2xl border border-white/15 bg-[#10141c] p-5 text-white shadow-2xl"
      >
        <div className="text-sm font-semibold">{isZh ? "建立解說短片" : "New explainer video"}</div>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {isZh
            ? "規劃分鏡免費。完成後會展開成每段的靜幀、影片、配音和拼接節點，按 Run 才會扣 USD Credit。"
            : "Planning is free. It expands into per-clip still, video, voice, and concat nodes; USD Credit is charged only when you press Run."}
        </p>

        <label className="mt-4 block text-[11px] text-white/55">
          {isZh ? "解說主題 / 講稿" : "Topic / script"}
          <textarea
            autoFocus
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={4}
            placeholder={isZh ? "例如：用煮食譜嘅比喻解釋乜嘢係源代碼…" : "e.g. Explain compound interest with three simple analogies…"}
            className="nodrag nowheel mt-1 w-full resize-none rounded-[10px] border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-[12px] leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#c6f24b]/60 focus:outline-none"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1 text-[11px] text-white/55">
            {isZh ? "解說風格" : "Director style"}
            <select value={skillSlug} onChange={(e) => setSkillSlug(e.target.value)} className={FIELD}>
              <option value="cartoon-explainer-video-director">{isZh ? "白板手繪" : "Whiteboard"}</option>
              <option value="paper-cutout-explainer-video-director">{isZh ? "剪紙拼貼" : "Paper cutout"}</option>
              <option value="papercraft-diorama-director">{isZh ? "3D 摺紙微縮" : "Papercraft"}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/55">
            {isZh ? "語言" : "Language"}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as ExplainerPlanDialogValues["language"])}
              className={FIELD}
            >
              <option value="yue">廣東話</option>
              <option value="zh">國語</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/55">
            {isZh ? "片長" : "Length"}
            <select
              value={durationPreset}
              onChange={(e) => setDurationPreset(e.target.value as ExplainerPlanDialogValues["durationPreset"])}
              className={FIELD}
            >
              <option value="15s">15s</option>
              <option value="30s">30s</option>
              <option value="45s">45s</option>
              <option value="60s">60s</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/55">
            {isZh ? "比例" : "Ratio"}
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as CanvasAspectRatio)}
              className={FIELD}
            >
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
              <option value="1:1">1:1</option>
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-[11px] text-white/55">
            {isZh ? "角色（選填）" : "Character (optional)"}
            <select value={characterId} onChange={(e) => setCharacterId(e.target.value)} className={FIELD}>
              <option value="">{isZh ? "不指定" : "None"}</option>
              {characterOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#c6f24b] px-3 py-1.5 text-xs font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isZh ? "規劃分鏡（免費）" : "Plan storyboard (free)"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
