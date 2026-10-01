"use client";

import { useId, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
} from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { skillBansNarration } from "@/service/director/skill-rules";
import { FRAMES_COST } from "@/service/production-plan";
import type { ClipStoryboardInput, StoryboardRow, VoLanguage } from "@/model/project";

const MAX_FIELD_LENGTH = 1200;

export type ClipScenePending = "" | "save" | "regenerate";

export function ClipScenePrompts({
  clip,
  language,
  dualBeat,
  skillSlug,
  credits,
  pending,
  onSave,
}: {
  clip: StoryboardRow;
  language: VoLanguage;
  dualBeat?: boolean;
  skillSlug?: string;
  credits: number;
  pending: ClipScenePending;
  onSave: (input: ClipStoryboardInput, regenerate: boolean) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const fieldId = useId();
  const voLabel = LANGUAGE_PRESETS[language].label;
  const spokenKind = skillBansNarration(skillSlug) ? "dialogue" : "narration";
  const spoken = (key: string, params?: Record<string, string | number>) =>
    t(`production.spoken.${spokenKind}.${key}`, params);
  const [draft, setDraft] = useState<ClipStoryboardInput>(() => draftFromClip(clip));

  const busy = pending !== "";
  const dirty = isDraftDirty(draft, clip);
  const valid = dualBeat
    ? Boolean(
        draft.startScene?.trim() &&
          draft.endScene?.trim() &&
          draft.startVo?.trim() &&
          draft.endVo?.trim(),
      )
    : draft.explainerScene.trim().length > 0 && draft.englishVo.trim().length > 0;
  const enoughCredits = credits >= FRAMES_COST;
  const canSave = valid && dirty && !busy;
  const canRedraw = valid && !busy;

  function update<K extends keyof ClipStoryboardInput>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(regenerate: boolean) {
    if (regenerate ? !canRedraw : !canSave) return;
    await onSave(
      {
        explainerScene: draft.explainerScene.trim(),
        motionCamera: draft.motionCamera.trim(),
        englishVo: draft.englishVo.trim(),
        startScene: draft.startScene?.trim(),
        endScene: draft.endScene?.trim(),
        startVo: draft.startVo?.trim(),
        endVo: draft.endVo?.trim(),
      },
      regenerate,
    );
  }

  const sceneSummary = dualBeat
    ? t("production.scene.summaryStart", { text: draft.startScene || t("production.scene.empty") })
    : draft.explainerScene || t("production.scene.empty");

  return (
    <div className="flex flex-col gap-3">
      <FormSection title={spoken("section")}>
        {dualBeat ? (
          <>
            <TextField
              id={`${fieldId}-vo-start`}
              label={spoken("startField", { lang: voLabel })}
              value={draft.startVo || ""}
              rows={2}
              disabled={busy}
              placeholder={spoken("startPlaceholder")}
              onChange={(value) => update("startVo", value)}
            />
            <TextField
              id={`${fieldId}-vo-end`}
              label={spoken("endField", { lang: voLabel })}
              value={draft.endVo || ""}
              rows={2}
              disabled={busy}
              placeholder={spoken("endPlaceholder")}
              onChange={(value) => update("endVo", value)}
            />
          </>
        ) : (
          <TextField
            id={`${fieldId}-vo`}
            label={spoken("field", { lang: voLabel })}
            value={draft.englishVo}
            rows={3}
            disabled={busy}
            placeholder={spoken("placeholder")}
            onChange={(value) => update("englishVo", value)}
          />
        )}
      </FormSection>

      <FormSection title={t("production.scene.sectionScene")} summary={sceneSummary} collapsible>
        {dualBeat ? (
          <>
            <TextField
              id={`${fieldId}-start`}
              label={t("production.scene.labelStartScene")}
              value={draft.startScene || ""}
              rows={4}
              disabled={busy}
              placeholder={t("production.scene.placeholderStartScene")}
              onChange={(value) => update("startScene", value)}
            />
            <TextField
              id={`${fieldId}-end`}
              label={t("production.scene.labelEndScene")}
              value={draft.endScene || ""}
              rows={4}
              disabled={busy}
              placeholder={t("production.scene.placeholderEndScene")}
              onChange={(value) => update("endScene", value)}
            />
          </>
        ) : (
          <TextField
            id={`${fieldId}-scene`}
            label={t("production.scene.labelExplainerScene")}
            value={draft.explainerScene}
            rows={5}
            disabled={busy}
            placeholder={t("production.scene.placeholderExplainerScene")}
            onChange={(value) => update("explainerScene", value)}
          />
        )}
      </FormSection>

      <FormSection
        title={t("production.scene.sectionMotion")}
        summary={draft.motionCamera || t("production.scene.empty")}
        collapsible
      >
        <TextField
          id={`${fieldId}-motion`}
          label={t("production.scene.labelMotion")}
          value={draft.motionCamera}
          rows={3}
          disabled={busy}
          placeholder={t("production.scene.placeholderMotion")}
          onChange={(value) => update("motionCamera", value)}
        />
      </FormSection>

      {dirty || busy ? (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-3">
          {!valid ? (
            <p className="text-xs font-medium text-accent">
              {dualBeat ? spoken("dualEmptyError") : spoken("emptyError")}
            </p>
          ) : !enoughCredits ? (
            <p className="text-xs font-medium text-accent">{t("production.scene.insufficientCreditsRedraw")}</p>
          ) : (
            <p className="text-[11px] text-[var(--studio-muted)]">{t("production.scene.redrawHint")}</p>
          )}
          <div className="flex gap-2">
            <StudioButton
              variant="ghost"
              onClick={() => void submit(false)}
              disabled={!canSave}
              className="min-h-9 flex-1 px-3 text-xs"
            >
              {pending === "save" ? <Spinner className="h-3.5 w-3.5" /> : null}
              {pending === "save" ? t("production.action.saving") : t("production.action.save")}
            </StudioButton>
            <StudioButton
              onClick={() => void submit(true)}
              disabled={!canRedraw}
              className="min-h-9 flex-[2] px-3 text-xs"
            >
              {pending === "regenerate" ? <Spinner className="h-3.5 w-3.5" /> : null}
              {pending === "regenerate"
                ? t("production.action.submitting")
                : t("production.action.saveAndRedraw", { cost: FRAMES_COST })}
            </StudioButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function draftFromClip(clip: StoryboardRow): ClipStoryboardInput {
  return {
    explainerScene: clip.explainerScene,
    motionCamera: clip.motionCamera,
    englishVo: clip.englishVo,
    startScene: clip.startScene ?? clipStartScene(clip),
    endScene: clip.endScene ?? clipEndScene(clip),
    startVo: clip.startVo ?? clipStartVo(clip),
    endVo: clip.endVo ?? clipEndVo(clip),
  };
}

function isDraftDirty(draft: ClipStoryboardInput, clip: StoryboardRow) {
  return (
    draft.explainerScene !== clip.explainerScene ||
    draft.motionCamera !== clip.motionCamera ||
    draft.englishVo !== clip.englishVo ||
    (draft.startScene ?? "") !== (clip.startScene ?? clipStartScene(clip)) ||
    (draft.endScene ?? "") !== (clip.endScene ?? clipEndScene(clip)) ||
    (draft.startVo ?? "") !== (clip.startVo ?? clipStartVo(clip)) ||
    (draft.endVo ?? "") !== (clip.endVo ?? clipEndVo(clip))
  );
}

function FormSection({
  title,
  summary,
  collapsible = false,
  children,
}: {
  title: string;
  summary?: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  if (!collapsible) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">{title}</h3>
        {children}
      </section>
    );
  }
  return (
    <details className="group rounded-md border border-[var(--studio-line)]">
      <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2">
        <span className="mt-0.5 text-[10px] text-[var(--studio-muted)] transition group-open:rotate-90">
          ▶
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold text-[var(--studio-muted)]">{title}</span>
          <span className="block truncate text-xs group-open:hidden">{summary}</span>
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>
    </details>
  );
}

function TextField({
  id,
  label,
  value,
  rows,
  disabled,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  rows: number;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold">
          {label}
        </label>
        <span className="text-[10px] tabular-nums text-[var(--studio-muted)]">
          {value.length}/{MAX_FIELD_LENGTH}
        </span>
      </div>
      <textarea
        id={id}
        rows={rows}
        maxLength={MAX_FIELD_LENGTH}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y rounded-md border border-[var(--studio-line)] bg-white px-3 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] disabled:opacity-60"
      />
    </div>
  );
}
