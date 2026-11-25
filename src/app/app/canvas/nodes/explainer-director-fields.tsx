"use client";

// Explainer Director parameters: topic, character, length, ratio, art style, languages,
// background, presenter position, and text style.

import type { CanvasNodeData } from "@/model/canvas";
import {
  EXPLAINER_PRESENTER_POSITIONS,
  EXPLAINER_SCENE_TEXT_CHOICES,
  EXPLAINER_SKILL_SLUGS,
} from "@/model/explainer-settings";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";
import { explainerBackgroundPresets } from "@/service/canvas/explainer-settings";
import { SYSTEM_TEXT_STYLE_ORDER, systemTextStylePreview } from "@/service/director/subtitle-look";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";
import { useI18n } from "@/presentation/components/i18n-provider";
import { libraryCharacterChoices } from "@/app/app/canvas/nodes/character-menu-options";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";
import { ART_STYLE_LABELS, PRESENTER_LABELS, SCENE_TEXT_LABELS } from "@/app/app/canvas/nodes/explainer-settings-options";
import { DIALOG_FIELD, DIALOG_LABEL, DIALOG_TEXTAREA } from "@/app/app/canvas/scro-dialog-shell";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  disabled: boolean;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
};

export function ExplainerDirectorFields({ data, isZh, disabled, characterOptions, onUpdate }: Props) {
  const { t } = useI18n();
  const tp = data.toolParams ?? {};
  const pick = (label: { zh: string; en: string }) => (isZh ? label.zh : label.en);
  const setParams = (patch: Record<string, unknown>) => onUpdate({ toolParams: { ...tp, ...patch } });
  const skillSlug = String(tp.skillSlug ?? "cartoon-explainer-video-director");
  const backgrounds = explainerBackgroundPresets(skillSlug);

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 disabled:opacity-60">
      <label className={DIALOG_LABEL}>
        {isZh ? "主題 / 講稿" : "Topic / script"}
        <ComposedTextarea
          rows={3}
          value={data.prompt ?? ""}
          onValue={(prompt) => onUpdate({ prompt })}
          placeholder={isZh ? "例如：用煮食譜嘅比喻解釋乜嘢係源代碼…" : "e.g. Explain compound interest with three analogies…"}
          className={DIALOG_TEXTAREA}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className={DIALOG_LABEL}>
          {isZh ? "畫風" : "Art style"}
          <select
            value={skillSlug}
            // A new art style falls back to that style's default background.
            onChange={(e) => setParams({ skillSlug: e.target.value, directorBackgroundId: undefined })}
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
          {isZh ? "旁白語言" : "Voice language"}
          <select value={String(tp.language ?? "yue")} onChange={(e) => setParams({ language: e.target.value })} className={DIALOG_FIELD}>
            <option value="yue">廣東話</option>
            <option value="zh">國語</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "片長" : "Length"}
          <select
            value={String(tp.durationPreset ?? "30s")}
            onChange={(e) => setParams({ durationPreset: e.target.value })}
            className={DIALOG_FIELD}
          >
            {["15s", "30s", "45s", "60s"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "比例" : "Ratio"}
          <select
            value={data.aspectRatio ?? "9:16"}
            onChange={(e) => onUpdate({ aspectRatio: e.target.value as CanvasNodeData["aspectRatio"] })}
            className={DIALOG_FIELD}
          >
            {["9:16", "16:9", "1:1"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <div className={`col-span-2 ${DIALOG_LABEL}`}>
          {isZh ? "角色" : "Character"}
          <CanvasPreviewSelect
            value={String(tp.characterId ?? "")}
            ariaLabel={isZh ? "角色" : "Character"}
            options={libraryCharacterChoices(characterOptions, isZh ? "不指定" : "None")}
            onChange={(characterId) => setParams({ characterId: characterId || undefined })}
          />
        </div>
        <label className={DIALOG_LABEL}>
          {isZh ? "畫面文字語言" : "On-screen text"}
          <select
            value={String(tp.sceneTextLanguage ?? (tp.language === "en" ? "en" : "zh-Hant"))}
            onChange={(e) => setParams({ sceneTextLanguage: e.target.value })}
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
          {isZh ? "主持人位置" : "Presenter"}
          <select
            value={String(tp.presenterPosition ?? "auto")}
            onChange={(e) => setParams({ presenterPosition: e.target.value })}
            className={DIALOG_FIELD}
          >
            {EXPLAINER_PRESENTER_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pick(PRESENTER_LABELS[pos])}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={DIALOG_LABEL}>
        {isZh ? "背景" : "Background"}
        {backgrounds.length === 0 ? (
          <select disabled value="" className={`${DIALOG_FIELD} disabled:cursor-not-allowed disabled:opacity-50`}>
            <option value="">{isZh ? "白板（此畫風固定）" : "Whiteboard (fixed for this style)"}</option>
          </select>
        ) : (
          <CanvasPreviewSelect
            value={String(tp.directorBackgroundId ?? backgrounds[0]?.id ?? "")}
            ariaLabel={isZh ? "背景" : "Background"}
            options={backgrounds.map((bg) => ({
              value: bg.id,
              label: isZh ? bg.nameZhHant : bg.nameEn,
              sublabel: isZh ? bg.descriptionZhHant : bg.descriptionEn,
              previewUrl: bg.previewUrl,
              swatch: bg.swatch,
            }))}
            onChange={(directorBackgroundId) => setParams({ directorBackgroundId })}
          />
        )}
      </div>

      <div className={DIALOG_LABEL}>
        {isZh ? "畫面文字樣式（即時生效，不用 Replan）" : "On-screen text style (no replan needed)"}
        <CanvasPreviewSelect
          value={String(tp.textStyleId ?? "handwritten")}
          ariaLabel={isZh ? "畫面文字樣式" : "On-screen text style"}
          options={SYSTEM_TEXT_STYLE_ORDER.map((look) => {
            const copy = subtitleLookLabel(t, look);
            return {
              value: look,
              label: copy.label,
              sublabel: copy.sublabel,
              previewUrl: systemTextStylePreview(look),
              previewFit: "contain" as const,
            };
          })}
          onChange={(textStyleId) => setParams({ textStyleId })}
        />
      </div>
    </fieldset>
  );
}
