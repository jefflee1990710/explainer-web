"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { SCENE_TEXT_PRESETS } from "@/service/director/scene-text";
import {
  phaseAEditsEqual,
  phaseAToEditInput,
} from "@/service/director/phase-a-edit";
import type { PublicProject } from "@/presentation/serialize";
import type { PhaseAEditInput } from "@/model/project";
import { ReviseStoryboardDialog } from "@/presentation/components/app/projects/new/revise-storyboard-dialog";
import { StoryboardClipRow } from "@/presentation/components/app/projects/new/storyboard-clip-row";
import { StoryboardProposalFields } from "@/presentation/components/app/projects/new/storyboard-proposal-fields";

const ease = [0.22, 1, 0.36, 1] as const;

// Inline storyboard shown right under the form once Phase A lands.
export function StoryboardPreview({
  project,
  credits,
  subscribed,
  pending,
  error,
  onApprove,
  onRevise,
  onSave,
  approved = false,
  onBackToProduction,
}: {
  project: PublicProject;
  credits: number;
  subscribed: boolean;
  pending: "revise" | "approve" | "save" | "";
  error: string;
  onApprove: () => void;
  onRevise: (note: string, options?: { clipsOnly?: boolean }) => void;
  onSave: (input: PhaseAEditInput) => Promise<boolean>;
  // Already in production: edit in place, then jump back to 製作.
  approved?: boolean;
  onBackToProduction?: () => void;
}) {
  const [note, setNote] = useState("");
  const [confirmRevise, setConfirmRevise] = useState<false | "all" | "clips">(
    false,
  );
  const phaseA = project.phaseA;
  const saved = useMemo(
    () => (phaseA ? phaseAToEditInput(phaseA) : null),
    [phaseA],
  );
  const [draft, setDraft] = useState<PhaseAEditInput | null>(() => saved);

  if (!phaseA || !saved || !draft) return null;
  const currentDraft = draft;

  const language = LANGUAGE_PRESETS[project.language];
  const busy = pending !== "";
  const dirty = !phaseAEditsEqual(currentDraft, saved);

  async function persistIfDirty() {
    if (!dirty) return true;
    return onSave(currentDraft);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease }}
      className="space-y-5"
    >
      <header className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
          Phase A · 分鏡提案
        </p>
        <p className="mt-2 text-sm text-muted">
          標題、訊息與每一段分鏡都可以直接改。儲存不扣 credits。右下角可依這份提案重新規劃下方分鏡。
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Chip>{phaseA.targetDuration}</Chip>
          <Chip>{phaseA.clipCount} 段 clips</Chip>
          <Chip>{project.aspectRatio}</Chip>
          <Chip>{language.label} 旁白</Chip>
          <Chip>
            {`畫面文字 · ${SCENE_TEXT_PRESETS[project.sceneTextLanguage].label}`}
          </Chip>
          <Chip>線性結尾</Chip>
        </div>
        <div className="mt-5">
          <StoryboardProposalFields draft={currentDraft} disabled={busy} onChange={setDraft} />
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmRevise("clips")}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 py-2 text-sm font-semibold text-lime shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "revise" ? <Spinner /> : null}
            {pending === "revise" ? "規劃中…" : "重新規劃分鏡"}
          </button>
        </div>
      </header>

      <div className="space-y-3">
        <div className="hidden gap-3 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted md:grid md:grid-cols-[72px_1fr_1fr]">
          <p>Clip</p>
          <p>場景描述</p>
          <p>旁白（{language.label}）</p>
        </div>
        <ol className="grid gap-3">
          {phaseA.clips.map((clip, index) => (
            <StoryboardClipRow
              key={clip.clipNumber}
              clipNumber={clip.clipNumber}
              timeRange={clip.timeRange}
              draft={currentDraft.clips[index]}
              language={project.language}
              dualBeat={isDualBeatSkill(project.skillSlug)}
              disabled={busy}
              onChange={(next) => {
                setDraft({
                  ...currentDraft,
                  clips: currentDraft.clips.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, ...next } : row,
                  ),
                });
              }}
            />
          ))}
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <form
          className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) setConfirmRevise("all");
          }}
        >
          <label htmlFor="revise-note" className="block text-sm font-semibold">
            想改哪裡？
          </label>
          <p className="mt-1 text-xs text-muted">
            可先直接改上方內容並儲存；或寫下意見後重寫整份分鏡提案。
          </p>
          <textarea
            id="revise-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            placeholder="例如：鉤子再強一點、最後加上 CTA、語氣更輕鬆"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => void onSave(currentDraft)}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-5 py-2 text-sm font-semibold shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "save" ? <Spinner /> : null}
              {pending === "save" ? "儲存中…" : "儲存修改"}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-5 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "revise" ? <Spinner /> : null}
              {pending === "revise" ? "重寫中…" : "重寫分鏡提案"}
            </button>
          </div>
        </form>

        <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
          {approved ? (
            <>
              <p className="font-display text-sm font-bold">分鏡已核准，可繼續改稿</p>
              <p className="mt-2 text-sm">
                儲存文字會讓對應畫格／影片標成需重做。重寫整份分鏡會回到核准前。
              </p>
              <motion.button
                type="button"
                onClick={() => {
                  void persistIfDirty().then((ok) => {
                    if (ok) onBackToProduction?.();
                  });
                }}
                disabled={busy}
                whileTap={{ scale: 0.98 }}
                className="mt-4 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending === "save" ? <Spinner /> : null}
                儲存並返回
              </motion.button>
            </>
          ) : (
            <>
              <p className="font-display text-sm font-bold">核准分鏡，進入逐段製作</p>
              <p className="mt-2 text-sm">
                核准不扣 credits。之後每段各自產生：畫格 2 credits、影片 1 credit
                <span className="text-muted">（剩餘 {credits}）</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                可以先做第 1 段看效果，滿意再做下一段；隨時可回頭重做任何一段。
              </p>
              {!subscribed ? (
                <p className="mt-2 text-xs text-accent">尚未訂閱；製作階段的產生按鈕需要訂閱。</p>
              ) : null}
              <motion.button
                type="button"
                onClick={() => {
                  void persistIfDirty().then((ok) => {
                    if (ok) onApprove();
                  });
                }}
                disabled={busy}
                whileTap={{ scale: 0.98 }}
                className="mt-4 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending === "approve" ? <Spinner /> : null}
                {pending === "approve" ? "送出中…" : "核准分鏡，開始製作"}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}

      {confirmRevise ? (
        <ReviseStoryboardDialog
          pending={pending === "revise" || pending === "save"}
          title={
            confirmRevise === "clips"
              ? "重新規劃下方分鏡？"
              : "用 AI 重寫分鏡提案？"
          }
          body={
            confirmRevise === "clips"
              ? "會依上方分鏡提案重新規劃下方每一段 clip 的畫面與旁白。標題與提案欄位會保留，分鏡內容無法復原。"
              : undefined
          }
          confirmLabel={confirmRevise === "clips" ? "確認規劃" : undefined}
          onCancel={() => {
            if (pending === "") setConfirmRevise(false);
          }}
          onConfirm={() => {
            const clipsOnly = confirmRevise === "clips";
            void persistIfDirty().then((ok) => {
              if (!ok) {
                setConfirmRevise(false);
                return;
              }
              onRevise(clipsOnly ? "" : note, { clipsOnly });
              setConfirmRevise(false);
            });
          }}
        />
      ) : null}
    </motion.section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-accent-ink/10 bg-paper px-2.5 py-1 font-medium">
      {children}
    </span>
  );
}
