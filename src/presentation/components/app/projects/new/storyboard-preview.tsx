"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { spokenLineCopy } from "@/service/director/spoken-line";
import { useI18n } from "@/presentation/components/i18n-provider";
import { sceneTextLangLabel } from "@/util/i18n/picker-labels";
import { translateAppError } from "@/util/i18n/translate-app-error";
import {
  phaseAEditsEqual,
  phaseAToEditInput,
} from "@/service/director/phase-a-edit";
import type { PublicProject } from "@/presentation/serialize";
import { FRAMES_COST, MIN_VIDEO_COST, VIDEO_CREDITS_PER_SECOND } from "@/service/production-plan";
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
  const { t } = useI18n();
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
  const spoken = spokenLineCopy(project.skillSlug);
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
          {t("brief.storyboard.kicker")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("brief.storyboard.intro")}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Chip>{phaseA.targetDuration}</Chip>
          <Chip>{t("brief.storyboard.chipClips", { n: phaseA.clipCount })}</Chip>
          <Chip>{project.aspectRatio}</Chip>
          <Chip>{spoken.languageChip(language.label)}</Chip>
          <Chip>
            {t("brief.storyboard.chipSceneText", {
              label: sceneTextLangLabel(t, project.sceneTextLanguage).label,
            })}
          </Chip>
          <Chip>{t("brief.storyboard.chipLinearEnding")}</Chip>
        </div>
        <div className="mt-5">
          <StoryboardProposalFields
            draft={currentDraft}
            skillSlug={project.skillSlug}
            disabled={busy}
            onChange={setDraft}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmRevise("clips")}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 py-2 text-sm font-semibold text-lime shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "revise" ? <Spinner /> : null}
            {pending === "revise" ? t("brief.storyboard.replanPending") : t("brief.storyboard.replan")}
          </button>
        </div>
      </header>

      <div className="space-y-3">
        <div className="hidden gap-3 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted md:grid md:grid-cols-[72px_1fr_1fr]">
          <p>{t("brief.storyboard.columnClip")}</p>
          <p>{t("brief.storyboard.columnScene")}</p>
          <p>{spoken.field(language.label)}</p>
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
              skillSlug={project.skillSlug}
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
            {t("brief.storyboard.revisePrompt")}
          </label>
          <p className="mt-1 text-xs text-muted">{t("brief.storyboard.reviseHint")}</p>
          <textarea
            id="revise-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            placeholder={t("brief.storyboard.revisePlaceholder")}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => void onSave(currentDraft)}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-5 py-2 text-sm font-semibold shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "save" ? <Spinner /> : null}
              {pending === "save" ? t("brief.storyboard.savePending") : t("brief.storyboard.save")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-5 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "revise" ? <Spinner /> : null}
              {pending === "revise" ? t("brief.storyboard.revisePending") : t("brief.storyboard.revise")}
            </button>
          </div>
        </form>

        <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
          {approved ? (
            <>
              <p className="font-display text-sm font-bold">{t("brief.storyboard.approvedTitle")}</p>
              <p className="mt-2 text-sm">{t("brief.storyboard.approvedBody")}</p>
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
                {t("brief.storyboard.approvedBack")}
              </motion.button>
            </>
          ) : (
            <>
              <p className="font-display text-sm font-bold">{t("brief.storyboard.approveTitle")}</p>
              <p className="mt-2 text-sm">
                {t("brief.storyboard.approvePricing", { frameCost: FRAMES_COST })}
                <span className="text-muted">{t("brief.storyboard.approveRemaining", { remaining: credits })}</span>
              </p>
              <p className="mt-1 text-xs text-muted">{t("brief.storyboard.approveTip")}</p>
              {!subscribed ? (
                <p className="mt-2 text-xs text-accent">{t("brief.storyboard.approveSubscribeRequired")}</p>
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
                {pending === "approve" ? t("brief.storyboard.approvePending") : t("brief.storyboard.approve")}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {translateAppError(error, t)}
        </p>
      ) : null}

      {confirmRevise ? (
        <ReviseStoryboardDialog
          pending={pending === "revise" || pending === "save"}
          title={
            confirmRevise === "clips"
              ? t("brief.storyboard.confirmReplanClipsTitle")
              : t("brief.storyboard.confirmReviseAllTitle")
          }
          body={
            confirmRevise === "clips" ? t("brief.storyboard.confirmReplanClipsBody") : undefined
          }
          confirmLabel={
            confirmRevise === "clips" ? t("brief.storyboard.confirmReplanClipsConfirm") : undefined
          }
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
