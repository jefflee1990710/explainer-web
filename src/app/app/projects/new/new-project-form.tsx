"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ClipProduction } from "@/components/project/clip-production";
import { currentStepFor, ProjectStepper } from "@/components/project/project-stepper";
import { Spinner } from "@/components/spinner";
import { StylePicker } from "@/components/style-picker";
import {
  generateClipFramesAction,
  generateClipVideoAction,
  generateRemainingAction,
} from "@/lib/actions/clip-production";
import {
  regenerateFrameAction,
  updateClipStoryboardAction,
} from "@/lib/actions/generation";
import {
  createVideoAction,
  getVideoAction,
  retryProjectAction,
  updateVideoBriefAction,
} from "@/lib/actions/projects";
import { composeReelAction } from "@/lib/actions/reel";
import { isProjectBusy, productionCounts } from "@/lib/clip-stage";
import { mergePolledProject, projectWithClearedFrames } from "@/lib/optimistic-frames";
import { isReelBusy, isReelCurrent } from "@/lib/reel/fingerprint";
import { DURATION_PRESETS } from "@/lib/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { SCENE_TEXT_PRESETS } from "@/lib/director/scene-text";
import { failedStepFor, isProductionLike } from "@/lib/project-status";
import type { PublicCharacter, PublicSkill, PublicStyle, PublicVideo } from "@/lib/serialize";
import { DEFAULT_STYLE_ID, type StyleId } from "@/lib/styles";
import type {
  AspectRatio,
  ClipStoryboardInput,
  DurationPreset,
  FramePosition,
  FrameRevisionInput,
  SceneTextLanguage,
  VoLanguage,
} from "@/types/project";
import { CharacterPicker } from "../[id]/character-picker";
import { SkillPicker } from "../[id]/skill-picker";
import { AspectRatioPicker } from "./aspect-ratio-picker";
import { DirectorProgress } from "./director-progress";
import { DurationPicker } from "./duration-picker";
import { LanguagePicker } from "./language-picker";
import { SceneTextPicker } from "./scene-text-picker";
import { ReelExport } from "./reel-export";
import { ReviseStoryboardDialog } from "./revise-storyboard-dialog";
import { useProjectPoll } from "./use-project-poll";

const ease = [0.22, 1, 0.36, 1] as const;

// Whole create → director → produce → export flow lives on this one page.
export function NewProjectForm({
  projectId,
  skills,
  styles,
  characters,
  initialVideo = null,
  credits,
  subscribed,
  onVideoCreated,
}: {
  projectId: string;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  initialVideo?: PublicVideo | null;
  credits: number;
  subscribed: boolean;
  onVideoCreated?: (video: PublicVideo) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Form fields
  const [skillSlug, setSkillSlug] = useState(
    initialVideo?.skillSlug || skills[0]?.slug || "",
  );
  // Visual style; the cast must share it, so changing it prunes mismatches.
  const [styleId, setStyleId] = useState<StyleId>(
    initialVideo?.styleId || DEFAULT_STYLE_ID,
  );
  const [source, setSource] = useState(initialVideo?.source || "");
  const [language, setLanguage] = useState<VoLanguage>(initialVideo?.language || "en");
  const [sceneTextEnabled, setSceneTextEnabled] = useState(
    initialVideo?.sceneTextEnabled === true,
  );
  const [sceneTextLanguage, setSceneTextLanguage] = useState<SceneTextLanguage>(
    initialVideo?.sceneTextLanguage || "en",
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | "">(
    initialVideo?.aspectRatio || "",
  );
  const [durationPreset, setDurationPreset] = useState<DurationPreset>(
    initialVideo?.durationPreset || "punchy",
  );
  const [characterIds, setCharacterIds] = useState<string[]>(
    initialVideo?.cast.map((member) => member.characterId) || [],
  );

  // Flow state. The stepper can jump back to 題材 after a video exists.
  const [project, setProject] = useState<PublicVideo | null>(initialVideo);
  const [submitting, setSubmitting] = useState(false);
  // "" | "retry" | "remaining" | "reel"
  // | frames:{n} | frame:{n}:{pos} | video:{n} | clip:{n}[:regen]
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  // Pinned to the video + status that was current when the user clicked a step.
  const [viewingOverride, setViewingOverride] = useState<{
    id: string | null;
    status: string;
    step: number;
  } | null>(null);
  const [confirmBrief, setConfirmBrief] = useState(false);
  // Previous stills, restored if the redo action never reaches the server.
  const redoSnapshotRef = useRef<PublicVideo | null>(null);

  const onPollUpdate = useCallback((next: PublicVideo) => {
    setProject((current) => (current ? mergePolledProject(current, next) : next));
  }, []);
  const onPollError = useCallback((message: string) => setError(message), []);
  useProjectPoll(project, onPollUpdate, onPollError);

  // Parent may show a list snapshot first, then replace with a fresh fetch.
  // Keep a newer local frame claim so a stale RSC refresh cannot restore the
  // previous still while a redo is already on screen as a skeleton.
  useEffect(() => {
    if (!initialVideo) return;
    setProject((current) => {
      if (!current || current.id !== initialVideo.id) return initialVideo;
      return mergePolledProject(current, initialVideo);
    });
  }, [initialVideo]);

  // Leftover 核准分鏡 videos enter 製作 the first time this form opens them.
  useEffect(() => {
    if (!project || project.status !== "awaiting_approval") return;
    let cancelled = false;
    void getVideoAction(project.id).then((result) => {
      if (cancelled || !result.ok) return;
      setProject(result.project);
    });
    return () => {
      cancelled = true;
    };
  }, [project?.id, project?.status]);

  function briefUnchanged() {
    if (!project) return false;
    const currentIds = project.cast.map((member) => member.characterId).slice().sort();
    const nextIds = characterIds.slice().sort();
    return (
      project.source === source.trim() &&
      project.skillSlug === skillSlug &&
      project.styleId === styleId &&
      project.language === language &&
      project.sceneTextEnabled === sceneTextEnabled &&
      project.sceneTextLanguage === sceneTextLanguage &&
      project.aspectRatio === aspectRatio &&
      project.durationPreset === durationPreset &&
      currentIds.length === nextIds.length &&
      currentIds.every((id, index) => id === nextIds[index])
    );
  }

  function briefFormData() {
    const formData = new FormData();
    formData.set("projectId", projectId);
    if (project) formData.set("videoId", project.id);
    formData.set("skillSlug", skillSlug);
    formData.set("styleId", styleId);
    formData.set("source", source);
    formData.set("language", language);
    formData.set("sceneTextEnabled", sceneTextEnabled ? "1" : "0");
    formData.set("sceneTextLanguage", sceneTextLanguage);
    formData.set("aspectRatio", aspectRatio);
    formData.set("durationPreset", durationPreset);
    for (const id of characterIds) formData.append("characterIds", id);
    return formData;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aspectRatio) {
      setError("請選擇畫面比例");
      return;
    }
    if (project && briefUnchanged()) {
      pinViewingStep(1);
      return;
    }
    if (project?.phaseA) {
      setConfirmBrief(true);
      return;
    }
    await submitBrief();
  }

  async function submitBrief() {
    setSubmitting(true);
    setError("");
    const result = project
      ? await updateVideoBriefAction(briefFormData())
      : await createVideoAction(briefFormData());
    setSubmitting(false);
    setConfirmBrief(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Switch to the stepper immediately; Phase A runs in the background.
    setProject(result.project);
    onVideoCreated?.(result.project);
    router.replace(`${pathname}?video=${result.project.id}`);
  }

  // Shared handler for every server action behind a paid button; billing errors
  // bounce to /app/billing.
  async function runPaid(
    key: string,
    action: () => Promise<
      { ok: true; project: PublicVideo } | { ok: false; error: string }
    >,
  ) {
    setPending(key);
    setError("");
    // Hide the old still/video immediately; the server write lands a moment later.
    setProject((current) => {
      if (!current) return current;
      const next = projectWithClearedFrames(current, key);
      redoSnapshotRef.current = next === current ? null : current;
      return next;
    });
    const result = await action();
    setPending("");
    if (!result.ok) {
      if (redoSnapshotRef.current) {
        setProject(redoSnapshotRef.current);
        redoSnapshotRef.current = null;
      }
      setError(result.error);
      if (result.error.includes("訂閱") || result.error.includes("credits 不足")) {
        router.push("/app/billing");
      }
      return false;
    }
    redoSnapshotRef.current = null;
    setProject(result.project);
    // Credits were just spent; refresh the server components so the header
    // balance and every `credits < cost` gate below it stop showing the old one.
    router.refresh();
    return true;
  }

  // Redo one frame; `revision` (sketch + remark) comes from the edit dialog.
  function onRegenerateFrame(
    clipNumber: number,
    position: FramePosition,
    revision?: FrameRevisionInput,
  ) {
    if (!project) return;
    void runPaid(`frame:${clipNumber}:${position}`, () =>
      regenerateFrameAction(project.id, clipNumber, position, revision),
    );
  }

  // Rewrite one clip's storyboard text; optionally redraw its two frames (2 credits).
  function onUpdateClip(
    clipNumber: number,
    input: ClipStoryboardInput,
    regenerate: boolean,
  ) {
    if (!project) return Promise.resolve(false);
    return runPaid(`clip:${clipNumber}${regenerate ? ":regen" : ""}`, () =>
      updateClipStoryboardAction(project.id, clipNumber, input, { regenerate }),
    );
  }

  // Per-clip production: both frames (2), one video (1), or fill every gap.
  function onGenerateFrames(clipNumber: number) {
    if (!project) return;
    void runPaid(`frames:${clipNumber}`, () =>
      generateClipFramesAction(project.id, clipNumber),
    );
  }

  function onGenerateVideo(clipNumber: number) {
    if (!project) return;
    void runPaid(`video:${clipNumber}`, () => generateClipVideoAction(project.id, clipNumber));
  }

  async function onFillRemaining() {
    if (!project) return false;
    const ok = await runPaid("remaining", async () => {
      const result = await generateRemainingAction(project.id);
      // Partial success: the project still updated, so surface the gaps only.
      if (result.ok && result.skipped.length > 0) {
        setError(
          `有 ${result.skipped.length} 段沒送出（#${result.skipped.join("、#")}），請到該段工作區重試。`,
        );
      }
      return result;
    });
    return ok;
  }

  const videoId = project?.id;
  const onComposeReel = useCallback(() => {
    if (!videoId) return;
    setPending("reel");
    setError("");
    void composeReelAction(videoId).then((result) => {
      setPending("");
      if (!result.ok) setError(result.error);
      else setProject(result.project);
    });
  }, [videoId]);

  // Failed → move back to the gate it fell over on (no charge).
  async function onRetry() {
    if (!project) return;
    setPending("retry");
    setError("");
    const result = await retryProjectAction(project.id);
    setPending("");
    if (!result.ok) setError(result.error);
    else setProject(result.project);
  }

  // Switching style drops selected characters drawn in a different style.
  function onStyleChange(id: StyleId) {
    setStyleId(id);
    setCharacterIds((ids) =>
      ids.filter((cid) => characters.find((c) => c.id === cid)?.styleId === id),
    );
  }

  function reset() {
    router.replace(pathname);
  }

  const skillTitle =
    skills.find((item) => item.slug === (project?.skillSlug || skillSlug))?.titleZh ||
    "影片類型";
  const styleName =
    styles.find((item) => item.id === (project?.styleId || styleId))?.nameZh || "視覺風格";
  const liveStep = currentStepFor(
    project?.status ?? "draft",
    project?.status === "failed" ? failedStepFor(project) : undefined,
  );
  const liveStatus = project?.status ?? "draft";
  const liveId = project?.id ?? null;
  const viewing =
    viewingOverride &&
    viewingOverride.id === liveId &&
    viewingOverride.status === liveStatus
      ? viewingOverride.step
      : liveStep;

  function pinViewingStep(step: number) {
    setViewingOverride({ id: liveId, status: liveStatus, step });
  }
  const briefBusy =
    submitting || Boolean(project && (isProjectBusy(project) || isReelBusy(project.reelStatus)));
  const approved = Boolean(project && isProductionLike(project.status));
  const clipsReady = project?.status === "ready";
  const reelReady = Boolean(project && isReelCurrent(project));
  // Stepper detail for the live current step; skipped before the storyboard exists.
  const counts =
    project && approved ? productionCounts(project) : null;
  const stepperDetail = clipsReady
    ? isReelBusy(project?.reelStatus)
      ? "合成中"
      : reelReady
        ? "可下載"
        : "待合成"
    : counts
      ? `影片 ${counts.videosDone}/${counts.total}`
      : undefined;
  const canSubmit =
    source.trim().length > 0 &&
    aspectRatio !== "" &&
    skillSlug !== "" &&
    !briefBusy;

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        {/* Step indicator: 題材 → 製作 → 成片 */}
        <div className="rounded-2xl border border-accent-ink/10 bg-paper/70 px-5 py-4">
          <ProjectStepper
            status={project?.status ?? "draft"}
            failedAtStep={project?.status === "failed" ? failedStepFor(project) : undefined}
            busy={
              project
                ? isProjectBusy(project) || isReelBusy(project.reelStatus)
                : false
            }
            detail={stepperDetail}
            viewingStep={viewing}
            onSelectStep={pinViewingStep}
            clipsReady={clipsReady}
            reelReady={reelReady}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {viewing === 0 ? (
            <motion.form
              key="form"
              onSubmit={onSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, ease }}
              className="space-y-7 rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.08)] backdrop-blur sm:p-8"
            >
              <input type="hidden" name="projectId" value={projectId} />

              <Section step="01" title="影片類型" hint="這支影片要用哪一種敘事方式：解說、故事、Demo、Q&A、清單或教學。">
                <SkillPicker
                  skills={skills}
                  value={skillSlug}
                  onChange={setSkillSlug}
                  disabled={briefBusy}
                />
                {/* Visual style sits under the narrative skill in the same step. */}
                <p className="mt-5 text-sm font-semibold">視覺風格</p>
                <p className="mt-1 text-xs text-muted">
                  分鏡圖與影片的畫風；角色必須是同一種風格。
                </p>
                <div className="mt-3">
                  <StylePicker
                    styles={styles}
                    value={styleId}
                    onChange={onStyleChange}
                    disabled={briefBusy}
                  />
                </div>
              </Section>

              <Section step="02" title="題材或腳本" hint="貼上文章、產品說明、或你想解釋的概念。">
                <label htmlFor="source" className="sr-only">
                  題材或腳本
                </label>
                <textarea
                  id="source"
                  name="source"
                  required
                  rows={7}
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  disabled={briefBusy}
                  className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-base leading-7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                  placeholder="例如：為什麼複利對年輕人特別重要？用一個簡單的比喻說明，最後給一個行動建議。"
                />
                <p className="mt-2 text-right text-xs tabular-nums text-muted">
                  {source.length.toLocaleString()} 字
                </p>
              </Section>

              <Section step="03" title="旁白語言" hint="影片會用這個語言配旁白；分鏡說明維持繁體中文。">
                <LanguagePicker value={language} onChange={setLanguage} disabled={briefBusy} />
              </Section>

              <Section
                step="04"
                title="畫面文字"
                hint="開啟後，分鏡圖裡的短標籤會用你選的語言；關閉則畫面完全不寫字。"
              >
                <SceneTextPicker
                  enabled={sceneTextEnabled}
                  language={sceneTextLanguage}
                  onEnabledChange={setSceneTextEnabled}
                  onLanguageChange={setSceneTextLanguage}
                  disabled={briefBusy}
                />
              </Section>

              <Section step="05" title="畫面比例" hint="依投放平台選擇。">
                <AspectRatioPicker
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  disabled={briefBusy}
                />
              </Section>

              <Section step="06" title="片長" hint="影響 clip 數量，也就是產片時要扣的 credits。">
                <DurationPicker
                  value={durationPreset}
                  onChange={setDurationPreset}
                  disabled={briefBusy}
                />
              </Section>

              <Section step="07" title="角色" hint="選填。最多 4 個；分鏡與分鏡圖會鎖定這些角色的藍圖。">
                <CharacterPicker
                  characters={characters}
                  styleId={styleId}
                  value={characterIds}
                  onChange={setCharacterIds}
                  disabled={briefBusy}
                />
              </Section>

              {error ? (
                <p role="alert" className="text-sm font-medium text-accent">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-4 border-t border-accent-ink/10 pt-6">
                <motion.button
                  type="submit"
                  disabled={!canSubmit}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {submitting ? <Spinner /> : null}
                  {submitting
                    ? "送出中…"
                    : project
                      ? "儲存並重新產生分鏡"
                      : "開始製作"}
                </motion.button>
                {project ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="min-h-[44px] cursor-pointer rounded-full px-3 text-sm font-semibold text-muted transition hover:text-foreground"
                  >
                    建立另一支
                  </button>
                ) : null}
                <p className="text-xs text-muted">
                  {project
                    ? "改題材會重寫分鏡並回到製作。已產生的畫格與影片會留著，但可能對不上。"
                    : "這一步不扣 credits。分鏡寫好後會直接進入製作，產畫格與影片才扣款。"}
                </p>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.35, ease }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/10 bg-paper/70 px-5 py-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold">{skillTitle}</span>
                <Dot />
                <span>{styleName}</span>
                <Dot />
                <span>{LANGUAGE_PRESETS[language].label}</span>
                <Dot />
                <span>
                  {sceneTextEnabled
                    ? `畫面文字 · ${SCENE_TEXT_PRESETS[sceneTextLanguage].label}`
                    : "畫面無字"}
                </span>
                <Dot />
                <span>{aspectRatio}</span>
                <Dot />
                <span>{DURATION_PRESETS[durationPreset].label}</span>
                {project?.cast.length ? (
                  <>
                    <Dot />
                    <span>{project.cast.map((member) => member.name).join("、")}</span>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                onClick={reset}
                className="min-h-[44px] cursor-pointer rounded-full px-3 text-sm font-semibold text-muted transition hover:text-foreground"
              >
                建立另一支
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {viewing === 1 && project?.status === "phase_a" ? (
            <DirectorProgress key="phase-a" />
          ) : viewing === 1 &&
            project?.phaseA &&
            isProductionLike(project.status) ? (
            <ClipProduction
              key="production"
              project={project}
              credits={credits}
              subscribed={subscribed}
              pending={pending}
              error={error}
              onGenerateFrames={onGenerateFrames}
              onRegenerateFrame={onRegenerateFrame}
              onUpdateClip={onUpdateClip}
              onGenerateVideo={onGenerateVideo}
              onFillRemaining={onFillRemaining}
              onGoToExport={() => pinViewingStep(2)}
            />
          ) : viewing === 2 && project?.status === "ready" ? (
            <ReelExport
              key="export"
              project={project}
              pending={pending}
              error={error}
              onCompose={onComposeReel}
            />
          ) : project?.status === "failed" && viewing === liveStep ? (
            <FailedCard
              key="failed"
              project={project}
              pending={pending}
              onRetry={() => void onRetry()}
            />
          ) : null}
        </AnimatePresence>

        {confirmBrief ? (
          <ReviseStoryboardDialog
            pending={submitting}
            title="重新產生分鏡？"
            body="會依這份題材重寫分鏡並回到製作。已產生的畫格與影片會留著，但可能對不上新分鏡。"
            confirmLabel="確認重寫"
            onCancel={() => {
              if (!submitting) setConfirmBrief(false);
            }}
            onConfirm={() => {
              void submitBrief();
            }}
          />
        ) : null}
      </div>
    </MotionConfig>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="flex items-center gap-3">
        <span className="font-display rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold">
          {step}
        </span>
        <span className="font-display text-base font-bold">{title}</span>
      </legend>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function FailedCard({
  project,
  pending,
  onRetry,
}: {
  project: PublicVideo;
  pending: string;
  onRetry: () => void;
}) {
  // Only Phase A can fail at project level now; anything further back is a
  // per-clip failure the user redoes inside the production workspace.
  const label = project.phaseA ? "回到製作，逐段重做" : "重新產生分鏡";
  return (
    <motion.section
      role="alert"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      className="rounded-[1.5rem] border border-accent/40 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(255,77,46,0.35)]"
    >
      <p className="font-display text-lg font-bold text-accent">這次沒有成功</p>
      <p className="mt-2 text-sm text-muted">{project.error || "請再試一次。"}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={pending !== ""}
        className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 py-2 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? <Spinner /> : null}
        {label}
      </button>
      <p className="mt-3 text-xs text-muted">失敗階段的 credits 已自動退回，重試不會重複扣款。</p>
    </motion.section>
  );
}

function Dot() {
  return <span aria-hidden className="h-1 w-1 rounded-full bg-accent-ink/30" />;
}
