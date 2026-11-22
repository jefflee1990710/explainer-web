"use client";

// Asks for the Talking Head script, character, and framing before a free plan starts.

import { useEffect, useState } from "react";
import type { CanvasAspectRatio } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";
import { AspectRatioField } from "./aspect-ratio-field";
import {
  DIALOG_FIELD,
  DIALOG_LABEL,
  DIALOG_TEXTAREA,
  ScroDialogShell,
} from "./scro-dialog-shell";

export type TalkingHeadFraming = "collarbone-close" | "waist-up" | "handheld-selfie" | "full-body";

export type TalkingHeadDialogValues = {
  script: string;
  characterId: string;
  language: "yue" | "zh" | "en";
  framing: TalkingHeadFraming;
  aspectRatio: CanvasAspectRatio;
};

type Props = {
  open: boolean;
  isZh: boolean;
  defaultScript?: string;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  onCancel: () => void;
  onSubmit: (values: TalkingHeadDialogValues) => void;
};

const FRAMINGS: { id: TalkingHeadFraming; zh: string; en: string }[] = [
  { id: "collarbone-close", zh: "近鏡（鎖骨以上）", en: "Close-up" },
  { id: "waist-up", zh: "半身（坐低）", en: "Waist up (seated)" },
  { id: "handheld-selfie", zh: "手持自拍", en: "Handheld selfie" },
  { id: "full-body", zh: "全身", en: "Full body" },
];

export function TalkingHeadDialog({
  open,
  isZh,
  defaultScript,
  characterOptions,
  onCancel,
  onSubmit,
}: Props) {
  const [script, setScript] = useState(defaultScript ?? "");
  const [characterId, setCharacterId] = useState("");
  const [language, setLanguage] = useState<TalkingHeadDialogValues["language"]>("yue");
  const [framing, setFraming] = useState<TalkingHeadFraming>("collarbone-close");
  const [aspectRatio, setAspectRatio] = useState<CanvasAspectRatio>("9:16");

  // Each open starts from the caller's script (empty for sidebar drops, sample text for the template).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the dialog reopens
    if (open) setScript(defaultScript ?? "");
  }, [open, defaultScript]);

  return (
    <ScroDialogShell
      open={open}
      isZh={isZh}
      title={isZh ? "建立 Talking Head 口播" : "New Talking Head"}
      description={
        isZh
          ? "規劃免費。完成後會展開成開場靜幀，以及每段的配音、HeyGen 對嘴影片、去停頓、調色和拼接節點，按 Run 才會扣 USD Credit。"
          : "Planning is free. It expands into an opening still plus per-clip voice, HeyGen lip-sync, silence trim, grade, and concat nodes; USD Credit is charged only when you press Run."
      }
      submitLabel={isZh ? "規劃（免費）" : "Plan (free)"}
      canSubmit={script.trim().length > 0 && Boolean(characterId)}
      onCancel={onCancel}
      onSubmit={() =>
        onSubmit({ script: script.trim(), characterId, language, framing, aspectRatio })
      }
    >
      <label className="block text-[11px] text-white/55">
        {isZh ? "講稿" : "Script"}
        <textarea
          autoFocus
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={5}
          placeholder={isZh ? "角色對住鏡頭要講嘅說話…" : "What the character says to camera…"}
          className={DIALOG_TEXTAREA}
        />
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <label className={`col-span-2 ${DIALOG_LABEL}`}>
          {isZh ? "角色" : "Character"}
          <select value={characterId} onChange={(e) => setCharacterId(e.target.value)} className={DIALOG_FIELD}>
            <option value="">{isZh ? "請選擇角色" : "Choose a character"}</option>
            {characterOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "語言" : "Language"}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as TalkingHeadDialogValues["language"])}
            className={DIALOG_FIELD}
          >
            <option value="yue">廣東話</option>
            <option value="zh">國語</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "鏡頭" : "Framing"}
          <select
            value={framing}
            onChange={(e) => setFraming(e.target.value as TalkingHeadFraming)}
            className={DIALOG_FIELD}
          >
            {FRAMINGS.map((f) => (
              <option key={f.id} value={f.id}>
                {isZh ? f.zh : f.en}
              </option>
            ))}
          </select>
        </label>
      </div>
      <AspectRatioField isZh={isZh} value={aspectRatio} onChange={setAspectRatio} />
    </ScroDialogShell>
  );
}
