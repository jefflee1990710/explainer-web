"use client";

// Explainer Settings node: one place for an Explainer group's background, on-screen text style
// and language, presenter position, and art style. Wired into every start-still frame.

import { explainerSettingsOf, explainerSettingsPatch } from "@/service/canvas/settings/registry";
import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Loader2, RefreshCw, SlidersHorizontal, Undo2 } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import {
  EXPLAINER_PRESENTER_POSITIONS,
  EXPLAINER_SCENE_TEXT_CHOICES,
  EXPLAINER_SKILL_SLUGS,
  type ExplainerSettings,
} from "@/model/explainer-settings";
import type { SubtitleLook } from "@/model/subtitle-look-id";
import { SYSTEM_TEXT_STYLE_ORDER, systemTextStylePreview } from "@/service/director/subtitle-look";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";
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
  const { locale, isFlowRunning, onApplyExplainerSettings, onUpdateNodeData } = useCanvasNodeActions();
  const { t } = useI18n();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const settings = explainerSettingsOf(data);
  const [busy, setBusy] = useState<"apply" | "replan" | null>(null);
  if (!settings) return null;

  const applied = settings.applied;
  const value = settings.draft ?? applied;
  const { changed, restyleOnly } = explainerSettingsChanges(applied, value);
  const backgrounds = explainerBackgroundPresets(value.skillSlug);
  const pick = (a: { zh: string; en: string }) => (isZh ? a.zh : a.en);
  // Edits are saved as a draft on the node so downstream previews can show they are old.
  const writeDraft = (draft: ExplainerSettings | undefined) =>
    onUpdateNodeData(id, explainerSettingsPatch({ ...settings, draft }));
  // A new art style resets the background to that director's default.
  const update = (patch: Partial<ExplainerSettings>) =>
    writeDraft(
      normalizeExplainerSettings({
        ...value,
        ...(patch.skillSlug && patch.skillSlug !== value.skillSlug ? { backgroundId: undefined } : {}),
        ...patch,
      }),
    );

  const run = async (mode: "apply" | "replan") => {
    setBusy(mode);
    try {
      await onApplyExplainerSettings(id, value, mode === "replan" ? { replan: true } : undefined);
    } finally {
      setBusy(null);
    }
  };
  const locked = busy !== null || isFlowRunning;

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

        <div className={DIALOG_LABEL}>
          {isZh ? "背景" : "Background"}
          {backgrounds.length === 0 ? (
            <select disabled value="" className={`${DIALOG_FIELD} disabled:cursor-not-allowed disabled:opacity-50`}>
              <option value="">{isZh ? "白板（此畫風固定）" : "Whiteboard (fixed for this style)"}</option>
            </select>
          ) : (
            <CanvasPreviewSelect
              value={value.backgroundId ?? ""}
              ariaLabel={isZh ? "背景" : "Background"}
              options={backgrounds.map((bg) => ({
                value: bg.id,
                label: isZh ? bg.nameZhHant : bg.nameEn,
                sublabel: isZh ? bg.descriptionZhHant : bg.descriptionEn,
                previewUrl: bg.previewUrl,
                swatch: bg.swatch,
              }))}
              onChange={(backgroundId) => update({ backgroundId })}
            />
          )}
        </div>

        <div className={DIALOG_LABEL}>
          {isZh ? "畫面文字樣式" : "On-screen text style"}
          <CanvasPreviewSelect
            value={value.textStyleId}
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
            onChange={(look) => update({ textStyleId: look as SubtitleLook })}
          />
        </div>

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
          <p className="rounded-[8px] border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-[10.5px] leading-relaxed text-amber-100">
            {restyleOnly
              ? isZh
                ? "設定未套用，下游預覽已標示為舊版本。按「套用」會免費重寫每段靜幀提示詞，之後按 Run group 重新生成。"
                : "Not applied yet; downstream previews are marked as old. Apply rewrites every start-still prompt (free); then press Run group."
              : isZh
                ? "設定未套用，下游預覽已標示為舊版本。這項更改需要免費重新規劃（約 1–2 分鐘），旁白逐字保留，整組節點會換成新的。"
                : "Not applied yet; downstream previews are marked as old. This change needs a free re-plan (about 1–2 minutes) that keeps the voiceover word for word and replaces the group."}
          </p>
        ) : null}

        <div className="flex gap-2">
          {changed.length > 0 && restyleOnly ? (
            <button
              type="button"
              disabled={locked}
              onClick={() => void run("apply")}
              className="nodrag inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#c6f24b] px-3 py-1.5 text-[11.5px] font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "apply" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {isZh ? "套用" : "Apply"}
            </button>
          ) : null}
          {/* Replan is always available: re-runs planning with these settings, keeping the voiceover. */}
          <button
            type="button"
            disabled={locked}
            onClick={() => void run("replan")}
            title={
              isZh
                ? "用目前設定免費重新規劃這組解說，旁白逐字保留"
                : "Re-plan this Explainer for free with these settings, keeping the voiceover"
            }
            className={`nodrag inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11.5px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              changed.length > 0 && !restyleOnly
                ? "bg-[#c6f24b] text-[#11141b] hover:brightness-105"
                : "border border-white/12 text-white/80 hover:bg-white/8"
            }`}
          >
            {busy === "replan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {isZh ? "重新規劃（免費）" : "Replan (free)"}
          </button>
          {changed.length > 0 ? (
            <button
              type="button"
              // Discarding a draft never touches outputs, so it stays available during a run.
              disabled={busy !== null}
              onClick={() => writeDraft(undefined)}
              title={isZh ? "還原為目前套用的設定" : "Back to the applied settings"}
              className="nodrag cursor-pointer rounded-[10px] border border-white/10 px-2 text-white/55 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
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
