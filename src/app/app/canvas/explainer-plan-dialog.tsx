"use client";

// Asks for the Explainer topic and settings before a free storyboard plan starts.

import { useEffect, useState } from "react";
import type { CanvasAspectRatio } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";
import {
  DIALOG_FIELD,
  DIALOG_LABEL,
  DIALOG_TEXTAREA,
  ScroDialogShell,
} from "./scro-dialog-shell";

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

  return (
    <ScroDialogShell
      open={open}
      isZh={isZh}
      title={isZh ? "建立解說短片" : "New explainer video"}
      description={
        isZh
          ? "規劃分鏡免費。完成後會展開成每段的靜幀、影片、配音和拼接節點，按 Run 才會扣 USD Credit。"
          : "Planning is free. It expands into per-clip still, video, voice, and concat nodes; USD Credit is charged only when you press Run."
      }
      submitLabel={isZh ? "規劃分鏡（免費）" : "Plan storyboard (free)"}
      canSubmit={topic.trim().length > 0}
      onCancel={onCancel}
      onSubmit={() =>
        onSubmit({
          topic: topic.trim(),
          skillSlug,
          language,
          durationPreset,
          aspectRatio,
          ...(characterId ? { characterId } : {}),
        })
      }
    >
      <label className="block text-[11px] text-white/55">
        {isZh ? "解說主題 / 講稿" : "Topic / script"}
        <textarea
          autoFocus
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={4}
          placeholder={isZh ? "例如：用煮食譜嘅比喻解釋乜嘢係源代碼…" : "e.g. Explain compound interest with three simple analogies…"}
          className={DIALOG_TEXTAREA}
        />
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <label className={DIALOG_LABEL}>
          {isZh ? "解說風格" : "Director style"}
          <select value={skillSlug} onChange={(e) => setSkillSlug(e.target.value)} className={DIALOG_FIELD}>
            <option value="cartoon-explainer-video-director">{isZh ? "白板手繪" : "Whiteboard"}</option>
            <option value="paper-cutout-explainer-video-director">{isZh ? "剪紙拼貼" : "Paper cutout"}</option>
            <option value="papercraft-diorama-director">{isZh ? "3D 摺紙微縮" : "Papercraft"}</option>
          </select>
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "語言" : "Language"}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as ExplainerPlanDialogValues["language"])}
            className={DIALOG_FIELD}
          >
            <option value="yue">廣東話</option>
            <option value="zh">國語</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "片長" : "Length"}
          <select
            value={durationPreset}
            onChange={(e) => setDurationPreset(e.target.value as ExplainerPlanDialogValues["durationPreset"])}
            className={DIALOG_FIELD}
          >
            <option value="15s">15s</option>
            <option value="30s">30s</option>
            <option value="45s">45s</option>
            <option value="60s">60s</option>
          </select>
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "比例" : "Ratio"}
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as CanvasAspectRatio)}
            className={DIALOG_FIELD}
          >
            <option value="9:16">9:16</option>
            <option value="16:9">16:9</option>
            <option value="1:1">1:1</option>
          </select>
        </label>
        <label className={`col-span-2 ${DIALOG_LABEL}`}>
          {isZh ? "角色（選填）" : "Character (optional)"}
          <select value={characterId} onChange={(e) => setCharacterId(e.target.value)} className={DIALOG_FIELD}>
            <option value="">{isZh ? "不指定" : "None"}</option>
            {characterOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </ScroDialogShell>
  );
}
