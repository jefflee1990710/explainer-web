"use client";

import { useEffect, useId, useState } from "react";
import { Spinner } from "@/components/spinner";
import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
} from "@/lib/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import type { ClipStoryboardInput, StoryboardRow, VoLanguage } from "@/types/project";

// Mirrors the server-side cap so the counter matches what gets stored.
const MAX_FIELD_LENGTH = 1200;

export type ClipEditPending = "" | "save" | "regenerate";

// Modal for rewriting one clip's storyboard text (scene, camera, voiceover)
// while reviewing frames. Saving is free; "save and redraw" also re-renders the
// clip's start + end frames from the new text (1 credit each).
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
  // False while another action is pending or frames are still generating.
  canRegenerate: boolean;
  pending: ClipEditPending;
  // Latest action error from the parent; only shown after this dialog submits.
  error: string;
  onClose: () => void;
  // Resolves true when the update landed (dialog closes itself).
  onSave: (input: ClipStoryboardInput, regenerate: boolean) => Promise<boolean>;
}) {
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
  // Set once the user submits so a stale parent error isn't shown on open.
  const [attempted, setAttempted] = useState(false);

  const busy = pending !== "";

  // Esc closes, matching the backdrop click (ignored mid-save).
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
  const enoughCredits = credits >= 2;
  const canSave = valid && dirty && !busy;
  // Redrawing from unchanged text is still allowed (it acts as a plain redo).
  const canRedraw = valid && !busy && canRegenerate && enoughCredits;

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
              分鏡 · #{clip.clipNumber} · {clip.timeRange}
            </p>
            <h2 id={titleId} className="font-display mt-1 text-xl font-bold">
              編輯這段分鏡內容
            </h2>
            <p className="mt-1 text-xs text-muted">
              直接改寫畫面、鏡頭與旁白。儲存不扣 credits；要依新內容重畫這段的兩張畫格才會扣款。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="關閉"
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
            {/* Left: what the image model draws */}
            <div className="space-y-4">
              {dualBeat ? (
                <>
                  <TextField
                    id={`${sceneId}-start`}
                    label="起始畫面"
                    hint="t=0 那張靜態圖。角色請用名字稱呼。"
                    value={draft.startScene || ""}
                    rows={5}
                    required
                    disabled={busy}
                    placeholder="起始姿勢、道具、環境。"
                    onChange={(value) => update("startScene", value)}
                  />
                  <TextField
                    id={`${sceneId}-end`}
                    label="結尾畫面"
                    hint="t=N 那張靜態圖。同一鏡頭的後一個 beat。"
                    value={draft.endScene || ""}
                    rows={5}
                    required
                    disabled={busy}
                    placeholder="結尾姿勢、道具、環境。"
                    onChange={(value) => update("endScene", value)}
                  />
                </>
              ) : (
                <TextField
                  id={sceneId}
                  label="畫面描述"
                  hint="分鏡圖與影片都依這段畫面來畫，角色請用名字稱呼。"
                  value={draft.explainerScene}
                  rows={7}
                  required
                  disabled={busy}
                  placeholder="這段畫面要出現什麼、誰在做什麼、有哪些道具或文字。"
                  onChange={(value) => update("explainerScene", value)}
                />
              )}
              <TextField
                id={cameraId}
                label="動態與鏡頭"
                hint="從起始到結尾的動作、鏡頭運動與轉場。"
                value={draft.motionCamera}
                rows={4}
                disabled={busy}
                placeholder="例如：鏡頭慢慢推近，角色從左走到右。"
                onChange={(value) => update("motionCamera", value)}
              />
            </div>

            {/* Right: what the narrator says */}
            <div className="space-y-4">
              {dualBeat ? (
                <>
                  <TextField
                    id={`${voId}-start`}
                    label={`旁白起（${voLabel}）`}
                    hint="前半句。畫面文字開啟時，起始圖只引用這句。"
                    value={draft.startVo || ""}
                    rows={4}
                    required
                    disabled={busy}
                    placeholder="起始 beat 要說的話。"
                    onChange={(value) => update("startVo", value)}
                  />
                  <TextField
                    id={`${voId}-end`}
                    label={`旁白終（${voLabel}）`}
                    hint="後半句。畫面文字開啟時，結尾圖只引用這句。"
                    value={draft.endVo || ""}
                    rows={4}
                    required
                    disabled={busy}
                    placeholder="結尾 beat 要說的話。"
                    onChange={(value) => update("endVo", value)}
                  />
                </>
              ) : (
                <TextField
                  id={voId}
                  label={`旁白（${voLabel}）`}
                  hint="影片裡會照這句逐字唸出。"
                  value={draft.englishVo}
                  rows={5}
                  required
                  disabled={busy}
                  placeholder="這段旁白要說的話。"
                  onChange={(value) => update("englishVo", value)}
                />
              )}
              {clip.clipNumber > 1 ? (
                <div className="rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-4 text-xs leading-5 text-muted">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.14em]">
                    提醒
                  </p>
                  <p className="mt-2">
                    上一段（#{clip.clipNumber - 1}）的結尾畫格是銜接到這段的；如果畫面變動很大，可回到時間軸單獨重畫那一張。
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <footer className="space-y-2 border-t border-accent-ink/10 px-6 py-4">
            <p className="text-xs text-muted">
              儲存並重畫將扣 <strong className="text-foreground">2 credits</strong>
              （起始＋結尾各 1 · 剩餘 {credits}）。
            </p>
            {!valid ? (
              <p className="text-xs font-medium text-accent">
                {dualBeat ? "起始／結尾畫面與兩句旁白不能空白。" : "畫面描述與旁白不能空白。"}
              </p>
            ) : !enoughCredits ? (
              <p className="text-xs font-medium text-accent">credits 不足，仍可儲存文字，但無法重畫。</p>
            ) : !canRegenerate && !busy ? (
              <p className="text-xs font-medium text-accent">請等目前的動作完成後再重畫。</p>
            ) : null}
            {attempted && error ? (
              <p role="alert" className="text-xs font-medium text-accent">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-5 text-sm font-semibold shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending === "save" ? <Spinner /> : null}
                {pending === "save" ? "儲存中…" : "只儲存文字"}
              </button>
              <button
                type="button"
                onClick={() => void submit(true)}
                disabled={!canRedraw}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending === "regenerate" ? <Spinner /> : <RefreshIcon />}
                {pending === "regenerate" ? "送出中…" : "儲存並重畫兩張 · 2 credits"}
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
