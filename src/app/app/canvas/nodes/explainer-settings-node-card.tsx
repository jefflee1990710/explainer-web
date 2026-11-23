"use client";

// Explainer Settings node: one place for an Explainer group's background, on-screen text style
// and language, presenter position, and art style. Wired into every start-still frame.

import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Loader2, SlidersHorizontal } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import {
  EXPLAINER_PRESENTER_POSITIONS,
  EXPLAINER_SCENE_TEXT_CHOICES,
  EXPLAINER_SKILL_SLUGS,
  type ExplainerSettings,
} from "@/model/explainer-settings";
import { SUBTITLE_LOOK_IDS, type SubtitleLook } from "@/model/subtitle-look-id";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  explainerBackgroundPresets,
  explainerSettingsChanges,
  normalizeExplainerSettings,
} from "@/service/canvas/explainer-settings";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";
import { DIALOG_FIELD, DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";
import {
  ART_STYLE_LABELS,
  EXPLAINER_SETTINGS_COLOR,
  PRESENTER_LABELS,
  SCENE_TEXT_LABELS,
} from "@/app/app/canvas/nodes/explainer-settings-options";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";

export function ExplainerSettingsNodeCard({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const { locale, isFlowRunning, onApplyExplainerSettings } = useCanvasNodeActions();
  const { t } = useI18n();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const settings = data.explainerSettings;
  const [draft, setDraft] = useState<ExplainerSettings | null>(null);
  const [applying, setApplying] = useState(false);
  if (!settings) return null;

  const applied = settings.applied;
  const value = draft ?? applied;
  const { changed, restyleOnly } = explainerSettingsChanges(applied, value);
  const backgrounds = explainerBackgroundPresets(value.skillSlug);
  const pick = (a: { zh: string; en: string }) => (isZh ? a.zh : a.en);
  // A new art style resets the background to that director's default.
  const update = (patch: Partial<ExplainerSettings>) =>
    setDraft(
      normalizeExplainerSettings({
        ...value,
        ...(patch.skillSlug && patch.skillSlug !== value.skillSlug ? { backgroundId: undefined } : {}),
        ...patch,
      }),
    );

  const apply = async () => {
    setApplying(true);
    try {
      await onApplyExplainerSettings(id, value);
      setDraft(null);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className={`relative w-[280px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/6 px-3 py-2">
        <span
          className="grid h-5 w-5 place-items-center rounded-md"
          style={{ backgroundColor: `${EXPLAINER_SETTINGS_COLOR}22`, color: EXPLAINER_SETTINGS_COLOR }}
        >
          <SlidersHorizontal className="h-3 w-3" />
        </span>
        <span className="text-[11.5px] font-semibold text-white/90">{isZh ? "解說設定" : "Explainer Settings"}</span>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        <label className={DIALOG_LABEL}>
          {isZh ? "畫風" : "Art style"}
          <select
            value={value.skillSlug}
            onChange={(e) => update({ skillSlug: e.target.value as ExplainerSettings["skillSlug"] })}
            className={DIALOG_FIELD}
          >
            {EXPLAINER_SKILL_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {pick(ART_STYLE_LABELS[slug])}
              </option>
            ))}
          </select>
        </label>

        <label className={DIALOG_LABEL}>
          {isZh ? "背景" : "Background"}
          <select
            value={value.backgroundId ?? ""}
            disabled={backgrounds.length === 0}
            onChange={(e) => update({ backgroundId: e.target.value })}
            className={`${DIALOG_FIELD} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {backgrounds.length === 0 ? (
              <option value="">{isZh ? "白板（此畫風固定）" : "Whiteboard (fixed for this style)"}</option>
            ) : (
              backgrounds.map((bg) => (
                <option key={bg.id} value={bg.id}>
                  {isZh ? bg.nameZhHant : bg.nameEn}
                </option>
              ))
            )}
          </select>
        </label>

        <label className={DIALOG_LABEL}>
          {isZh ? "畫面文字樣式" : "On-screen text style"}
          <select
            value={value.textStyleId}
            onChange={(e) => update({ textStyleId: e.target.value as SubtitleLook })}
            className={DIALOG_FIELD}
          >
            {SUBTITLE_LOOK_IDS.map((look) => (
              <option key={look} value={look}>
                {subtitleLookLabel(t, look).label}
              </option>
            ))}
          </select>
        </label>

        <label className={DIALOG_LABEL}>
          {isZh ? "畫面文字語言" : "On-screen text language"}
          <select
            value={value.sceneTextLanguage}
            onChange={(e) => update({ sceneTextLanguage: e.target.value as ExplainerSettings["sceneTextLanguage"] })}
            className={DIALOG_FIELD}
          >
            {EXPLAINER_SCENE_TEXT_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {pick(SCENE_TEXT_LABELS[choice])}
              </option>
            ))}
          </select>
        </label>

        <label className={DIALOG_LABEL}>
          {isZh ? "主持人位置" : "Presenter position"}
          <select
            value={value.presenterPosition}
            onChange={(e) => update({ presenterPosition: e.target.value as ExplainerSettings["presenterPosition"] })}
            className={DIALOG_FIELD}
          >
            {EXPLAINER_PRESENTER_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pick(PRESENTER_LABELS[pos])}
              </option>
            ))}
          </select>
        </label>

        {changed.length > 0 ? (
          <p className="rounded-[8px] bg-white/5 px-2 py-1.5 text-[10.5px] leading-relaxed text-white/55">
            {restyleOnly
              ? isZh
                ? "會即時重寫每段靜幀的提示詞（免費），並清除舊預覽，之後按 Run group 重新生成。"
                : "Rewrites every start-still prompt now (free) and clears the old previews; press Run group afterwards."
              : isZh
                ? "會用相同主題和旁白免費重新規劃這組解說（約 1–2 分鐘），整組節點會換成新的。"
                : "Re-plans this Explainer for free with the same topic and voiceover (about 1–2 minutes); the whole group is replaced."}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={changed.length === 0 || applying || isFlowRunning}
            onClick={() => void apply()}
            className="nodrag inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#c6f24b] px-3 py-1.5 text-[11.5px] font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {restyleOnly || changed.length === 0
              ? isZh
                ? "套用"
                : "Apply"
              : isZh
                ? "套用並重新規劃（免費）"
                : "Apply and re-plan (free)"}
          </button>
          {draft && changed.length > 0 ? (
            <button
              type="button"
              disabled={applying}
              onClick={() => setDraft(null)}
              className="nodrag cursor-pointer rounded-[10px] border border-white/10 px-2.5 text-[11px] text-white/55 transition hover:bg-white/8"
            >
              {isZh ? "還原" : "Reset"}
            </button>
          ) : null}
        </div>
      </div>

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ width: 12, height: 12, backgroundColor: EXPLAINER_SETTINGS_COLOR, border: "2px solid #0b0e13" }}
      />
    </div>
  );
}
