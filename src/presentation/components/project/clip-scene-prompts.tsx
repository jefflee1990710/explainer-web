"use client";

import { useEffect, useId, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
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

// Inline start/end scene prompts in 製作: save is free, redraw charges both frames.
export function ClipScenePrompts({
  clip,
  language,
  dualBeat,
  credits,
  pending,
  error,
  onSave,
}: {
  clip: StoryboardRow;
  language: VoLanguage;
  dualBeat?: boolean;
  credits: number;
  pending: ClipScenePending;
  error: string;
  onSave: (input: ClipStoryboardInput, regenerate: boolean) => Promise<boolean>;
}) {
  const sceneId = useId();
  const voLabel = LANGUAGE_PRESETS[language].label;
  const [draft, setDraft] = useState<ClipStoryboardInput>(() => draftFromClip(clip));
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setDraft(draftFromClip(clip));
    setAttempted(false);
  }, [clip.clipNumber, clip.editedAt]);

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
    setAttempted(true);
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

  return (
    <div>
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        畫面 prompt
      </p>
      <div className="mt-2 space-y-3 rounded-2xl border border-accent-ink/10 bg-paper p-4">
        {dualBeat ? (
          <>
            <PromptField
              id={`${sceneId}-start`}
              label="起始畫面"
              hint="t=0 靜態圖。改完可只存文字，或重畫兩張畫格。"
              value={draft.startScene || ""}
              rows={5}
              disabled={busy}
              placeholder="起始姿勢、道具、環境。"
              onChange={(value) => update("startScene", value)}
            />
            <PromptField
              id={`${sceneId}-end`}
              label="結尾畫面"
              hint="t=N 靜態圖。同一鏡頭的後一個 beat。"
              value={draft.endScene || ""}
              rows={5}
              disabled={busy}
              placeholder="結尾姿勢、道具、環境。"
              onChange={(value) => update("endScene", value)}
            />
          </>
        ) : (
          <PromptField
            id={sceneId}
            label="畫面描述"
            hint="起始與結尾畫格都依這段來畫。"
            value={draft.explainerScene}
            rows={6}
            disabled={busy}
            placeholder="這段畫面要出現什麼、誰在做什麼。"
            onChange={(value) => update("explainerScene", value)}
          />
        )}
        <PromptField
          id={`${sceneId}-motion`}
          label="動態與鏡頭"
          hint="兩張畫格之間怎麼插值。"
          value={draft.motionCamera}
          rows={3}
          disabled={busy}
          placeholder="例如：鏡頭慢慢推近，角色從左走到右。"
          onChange={(value) => update("motionCamera", value)}
        />
        {dualBeat ? (
          <>
            <PromptField
              id={`${sceneId}-vo-start`}
              label={`旁白起（${voLabel}）`}
              hint="前半句。畫面文字開啟時，起始圖只引用這句。"
              value={draft.startVo || ""}
              rows={2}
              disabled={busy}
              placeholder="起始 beat 要說的話。"
              onChange={(value) => update("startVo", value)}
            />
            <PromptField
              id={`${sceneId}-vo-end`}
              label={`旁白終（${voLabel}）`}
              hint="後半句。畫面文字開啟時，結尾圖只引用這句。"
              value={draft.endVo || ""}
              rows={2}
              disabled={busy}
              placeholder="結尾 beat 要說的話。"
              onChange={(value) => update("endVo", value)}
            />
          </>
        ) : (
          <PromptField
            id={`${sceneId}-vo`}
            label={`旁白（${voLabel}）`}
            hint="影片裡會照這句逐字唸出。"
            value={draft.englishVo}
            rows={3}
            disabled={busy}
            placeholder="這段旁白要說的話。"
            onChange={(value) => update("englishVo", value)}
          />
        )}

        {!valid ? (
          <p className="text-xs font-medium text-accent">
            {dualBeat ? "起始／結尾畫面與兩句旁白不能空白。" : "畫面描述與旁白不能空白。"}
          </p>
        ) : !enoughCredits ? (
          <p className="text-xs font-medium text-accent">credits 不足，仍可儲存文字，但無法重畫。</p>
        ) : null}
        {attempted && error ? (
          <p role="alert" className="text-xs font-medium text-accent">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void submit(false)}
            disabled={!canSave}
            className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/15 bg-paper px-3 text-xs font-semibold transition hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "save" ? <Spinner className="h-3.5 w-3.5" /> : null}
            {pending === "save" ? "儲存中…" : "只儲存文字"}
          </button>
          <button
            type="button"
            onClick={() => void submit(true)}
            disabled={!canRedraw}
            className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-3 text-xs font-semibold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "regenerate" ? <Spinner className="h-3.5 w-3.5" /> : <RefreshIcon />}
            {pending === "regenerate" ? "送出中…" : `儲存並重畫兩張 · ${FRAMES_COST}`}
          </button>
        </div>
      </div>
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

function PromptField({
  id,
  label,
  hint,
  value,
  rows,
  disabled,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  rows: number;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[10px] text-muted">
          {label}
        </label>
        <span className="text-[10px] tabular-nums text-muted">
          {value.length}/{MAX_FIELD_LENGTH}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] leading-4 text-muted">{hint}</p>
      <textarea
        id={id}
        rows={rows}
        maxLength={MAX_FIELD_LENGTH}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      />
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
