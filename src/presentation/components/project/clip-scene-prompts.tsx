"use client";

import { useId, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
} from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { FRAMES_COST } from "@/service/production-plan";
import type { ClipStoryboardInput, StoryboardRow, VoLanguage } from "@/model/project";

const MAX_FIELD_LENGTH = 1200;

export type ClipScenePending = "" | "save" | "regenerate";

// Clip text in three sections: voiceover (open), scene and camera (collapsed).
// A save bar appears only when something changed. Remount with a new `key`
// when the saved row changes so the draft resets.
export function ClipScenePrompts({
  clip,
  language,
  dualBeat,
  credits,
  pending,
  onSave,
}: {
  clip: StoryboardRow;
  language: VoLanguage;
  dualBeat?: boolean;
  credits: number;
  pending: ClipScenePending;
  onSave: (input: ClipStoryboardInput, regenerate: boolean) => Promise<boolean>;
}) {
  const fieldId = useId();
  const voLabel = LANGUAGE_PRESETS[language].label;
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
  const canRedraw = valid && !busy && enoughCredits;

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
    ? `起始：${draft.startScene || "（空白）"}`
    : draft.explainerScene || "（空白）";

  return (
    <div className="flex flex-col gap-3">
      <FormSection title="旁白">
        {dualBeat ? (
          <>
            <TextField
              id={`${fieldId}-vo-start`}
              label={`開頭旁白（${voLabel}）`}
              value={draft.startVo || ""}
              rows={2}
              disabled={busy}
              placeholder="起始 beat 要說的話，也會寫在起始畫格上。"
              onChange={(value) => update("startVo", value)}
            />
            <TextField
              id={`${fieldId}-vo-end`}
              label={`結尾旁白（${voLabel}）`}
              value={draft.endVo || ""}
              rows={2}
              disabled={busy}
              placeholder="結尾 beat 要說的話，也會寫在結尾畫格上。"
              onChange={(value) => update("endVo", value)}
            />
          </>
        ) : (
          <TextField
            id={`${fieldId}-vo`}
            label={`旁白（${voLabel}）`}
            value={draft.englishVo}
            rows={3}
            disabled={busy}
            placeholder="影片裡會照這句逐字唸出。"
            onChange={(value) => update("englishVo", value)}
          />
        )}
      </FormSection>

      <FormSection title="畫面描述" summary={sceneSummary} collapsible>
        {dualBeat ? (
          <>
            <TextField
              id={`${fieldId}-start`}
              label="起始畫面描述"
              value={draft.startScene || ""}
              rows={4}
              disabled={busy}
              placeholder="起始姿勢、道具、環境。"
              onChange={(value) => update("startScene", value)}
            />
            <TextField
              id={`${fieldId}-end`}
              label="結束畫面描述"
              value={draft.endScene || ""}
              rows={4}
              disabled={busy}
              placeholder="結尾姿勢、道具、環境。"
              onChange={(value) => update("endScene", value)}
            />
          </>
        ) : (
          <TextField
            id={`${fieldId}-scene`}
            label="畫面描述"
            value={draft.explainerScene}
            rows={5}
            disabled={busy}
            placeholder="這段畫面要出現什麼、誰在做什麼。"
            onChange={(value) => update("explainerScene", value)}
          />
        )}
      </FormSection>

      <FormSection title="鏡頭動作" summary={draft.motionCamera || "（空白）"} collapsible>
        <TextField
          id={`${fieldId}-motion`}
          label="鏡頭動作"
          value={draft.motionCamera}
          rows={3}
          disabled={busy}
          placeholder="例如：鏡頭慢慢推近，角色從左走到右。"
          onChange={(value) => update("motionCamera", value)}
        />
      </FormSection>

      {dirty || busy ? (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-3">
          {!valid ? (
            <p className="text-xs font-medium text-accent">
              {dualBeat ? "起始／結尾畫面與兩句旁白不能空白。" : "畫面描述與旁白不能空白。"}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--studio-muted)]">
              改過的文字要重畫畫格才會套用到畫面與影片。
            </p>
          )}
          <div className="flex gap-2">
            <StudioButton
              variant="ghost"
              onClick={() => void submit(false)}
              disabled={!canSave}
              className="min-h-9 flex-1 px-3 text-xs"
            >
              {pending === "save" ? <Spinner className="h-3.5 w-3.5" /> : null}
              {pending === "save" ? "儲存中…" : "儲存"}
            </StudioButton>
            <StudioButton
              onClick={() => void submit(true)}
              disabled={!canRedraw}
              className="min-h-9 flex-[2] px-3 text-xs"
            >
              {pending === "regenerate" ? <Spinner className="h-3.5 w-3.5" /> : null}
              {pending === "regenerate" ? "送出中…" : `儲存並重畫 · ${FRAMES_COST}`}
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

// Section header; collapsible sections show a one-line summary while closed.
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
