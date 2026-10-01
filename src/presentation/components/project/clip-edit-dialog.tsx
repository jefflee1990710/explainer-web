"use client";

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
} from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { FRAME_COST, FRAMES_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { ClipStoryboardInput, StoryboardRow, VoLanguage } from "@/model/project";

const MAX_FIELD_LENGTH = 1200;

export type ClipEditPending = "" | "save" | "regenerate";

export function ClipEditDialog({
  clip,
  language,
  dualBeat,
  credits,
  canRegenerate,
  pending,
  error,
  onClose,
  onSave,
}: {
  clip: StoryboardRow;
  language: VoLanguage;
  dualBeat?: boolean;
  credits: number;
  canRegenerate: boolean;
  pending: ClipEditPending;
  error: string;
  onClose: () => void;
  onSave: (input: ClipStoryboardInput, regenerate: boolean) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const sceneId = useId();
  const cameraId = useId();
  const voId = useId();
  const voLabel = LANGUAGE_PRESETS[language].label;

  const [draft, setDraft] = useState<ClipStoryboardInput>({
    explainerScene: clip.explainerScene,
    motionCamera: clip.motionCamera,
    englishVo: clip.englishVo,
    startScene: clip.startScene ?? clipStartScene(clip),
    endScene: clip.endScene ?? clipEndScene(clip),
    startVo: clip.startVo ?? clipStartVo(clip),
    endVo: clip.endVo ?? clipEndVo(clip),
  });
  const [attempted, setAttempted] = useState(false);

  const busy = pending !== "";

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const dirty =
    draft.explainerScene !== clip.explainerScene ||
    draft.motionCamera !== clip.motionCamera ||
    draft.englishVo !== clip.englishVo ||
    (draft.startScene ?? "") !== (clip.startScene ?? clipStartScene(clip)) ||
    (draft.endScene ?? "") !== (clip.endScene ?? clipEndScene(clip)) ||
    (draft.startVo ?? "") !== (clip.startVo ?? clipStartVo(clip)) ||
    (draft.endVo ?? "") !== (clip.endVo ?? clipEndVo(clip));
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
  const canRedraw = valid && !busy && canRegenerate;

  function update<K extends keyof ClipStoryboardInput>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(regenerate: boolean) {
    if (regenerate ? !canRedraw : !canSave) return;
    setAttempted(true);
    const ok = await onSave(
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
    if (ok) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-accent-ink/10 bg-paper shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
              {t("production.clipEdit.kicker", { n: clip.clipNumber, timeRange: clip.timeRange })}
            </p>
            <h2 id={titleId} className="font-display mt-1 text-xl font-bold">
              {t("production.clipEdit.title")}
            </h2>
            <p className="mt-1 text-xs text-muted">{t("production.clipEdit.intro")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("production.action.close")}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-muted transition hover:border-accent-ink/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(false);
          }}
        >
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-6 md:grid-cols-2">
            <div className="space-y-4">
              {dualBeat ? (
                <>
                  <TextField
                    id={`${sceneId}-start`}
                    label={t("production.clipEdit.labelStartScene")}
                    hint={t("production.clipEdit.hintStartScene")}
                    value={draft.startScene || ""}
                    rows={5}
                    required
                    disabled={busy}
                    placeholder={t("production.clipEdit.placeholderStartScene")}
                    onChange={(value) => update("startScene", value)}
                  />
                  <TextField
                    id={`${sceneId}-end`}
                    label={t("production.clipEdit.labelEndScene")}
                    hint={t("production.clipEdit.hintEndScene")}
                    value={draft.endScene || ""}
                    rows={5}
                    required
                    disabled={busy}
                    placeholder={t("production.clipEdit.placeholderEndScene")}
                    onChange={(value) => update("endScene", value)}
                  />
                </>
              ) : (
                <TextField
                  id={sceneId}
                  label={t("production.clipEdit.labelExplainerScene")}
                  hint={t("production.clipEdit.hintExplainerScene")}
                  value={draft.explainerScene}
                  rows={7}
                  required
                  disabled={busy}
                  placeholder={t("production.clipEdit.placeholderExplainerScene")}
                  onChange={(value) => update("explainerScene", value)}
                />
              )}
              <TextField
                id={cameraId}
                label={t("production.clipEdit.labelMotion")}
                hint={t("production.clipEdit.hintMotion")}
                value={draft.motionCamera}
                rows={4}
                disabled={busy}
                placeholder={t("production.clipEdit.placeholderMotion")}
                onChange={(value) => update("motionCamera", value)}
              />
            </div>

            <div className="space-y-4">
              {dualBeat ? (
                <>
                  <TextField
                    id={`${voId}-start`}
                    label={t("production.clipEdit.labelVoStart", { lang: voLabel })}
                    hint={t("production.clipEdit.hintVoStart")}
                    value={draft.startVo || ""}
                    rows={4}
                    required
                    disabled={busy}
                    placeholder={t("production.clipEdit.placeholderVoStart")}
                    onChange={(value) => update("startVo", value)}
                  />
                  <TextField
                    id={`${voId}-end`}
                    label={t("production.clipEdit.labelVoEnd", { lang: voLabel })}
                    hint={t("production.clipEdit.hintVoEnd")}
                    value={draft.endVo || ""}
                    rows={4}
                    required
                    disabled={busy}
                    placeholder={t("production.clipEdit.placeholderVoEnd")}
                    onChange={(value) => update("endVo", value)}
                  />
                </>
              ) : (
                <TextField
                  id={voId}
                  label={t("production.clipEdit.labelVo", { lang: voLabel })}
                  hint={t("production.clipEdit.hintVo")}
                  value={draft.englishVo}
                  rows={5}
                  required
                  disabled={busy}
                  placeholder={t("production.clipEdit.placeholderVo")}
                  onChange={(value) => update("englishVo", value)}
                />
              )}
              {clip.clipNumber > 1 ? (
                <div className="rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-4 text-xs leading-5 text-muted">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.14em]">
                    {t("production.clipEdit.continuityTitle")}
                  </p>
                  <p className="mt-2">
                    {t("production.clipEdit.continuityBody", { prev: clip.clipNumber - 1 })}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <footer className="space-y-2 border-t border-accent-ink/10 px-6 py-4">
            <p className="text-xs text-muted">
              {t("production.clipEdit.costNote", {
                cost: FRAMES_COST,
                frameCost: FRAME_COST,
                remaining: credits,
              })}
            </p>
            {!valid ? (
              <p className="text-xs font-medium text-accent">
                {dualBeat ? t("production.clipEdit.validationDualBeat") : t("production.clipEdit.validationSingle")}
              </p>
            ) : !enoughCredits ? (
              <p className="text-xs font-medium text-accent">{t("production.clipEdit.insufficientCreditsSaveOk")}</p>
            ) : !canRegenerate && !busy ? (
              <p className="text-xs font-medium text-accent">{t("production.clipEdit.waitForIdle")}</p>
            ) : null}
            {attempted && error ? (
              <p role="alert" className="text-xs font-medium text-accent">
                {translateAppError(error, t)}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("production.action.cancel")}
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-5 text-sm font-semibold shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending === "save" ? <Spinner /> : null}
                {pending === "save" ? t("production.action.saving") : t("production.clipEdit.saveTextOnly")}
              </button>
              <button
                type="button"
                onClick={() => void submit(true)}
                disabled={!canRedraw}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending === "regenerate" ? <Spinner /> : <RefreshIcon />}
                {pending === "regenerate"
                  ? t("production.action.submitting")
                  : t("production.clipEdit.saveAndRedrawBoth", { cost: FRAMES_COST })}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  hint,
  value,
  rows,
  required,
  disabled,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  rows: number;
  required?: boolean;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-display text-sm font-bold">
          {label}
          {required ? <span className="ml-1 text-accent">*</span> : null}
        </label>
        <span className="text-xs tabular-nums text-muted">
          {value.length}/{MAX_FIELD_LENGTH}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
      <textarea
        id={id}
        rows={rows}
        maxLength={MAX_FIELD_LENGTH}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      />
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
