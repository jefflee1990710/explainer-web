"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorStepNav } from "@/presentation/components/app/projects/[id]/editor-step-switch";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ClipProduction } from "@/presentation/components/project/clip-production";
import { VideoDesk } from "@/presentation/components/project/video-desk";
import { StudioPanel } from "@/presentation/studio/studio-panel";
import { currentStepFor } from "@/presentation/components/project/project-stepper";
import { Spinner } from "@/presentation/components/spinner";
import { StylePicker } from "@/presentation/components/style-picker";
import {
  generateAllClipsAction,
  generateAllSceneImagesAction,
  generateClipFramesAction,
  generateClipVideoAction,
  generateRemainingAction,
  generateSelectedClipsAction,
} from "@/presentation/actions/clip-production";
import type { BulkMode } from "@/presentation/components/project/bulk-generate-dialog";
import {
  regenerateFrameAction,
  updateClipStoryboardAction,
} from "@/presentation/actions/generation";
import {
  createVideoAction,
  getVideoAction,
  retryProjectAction,
  updateVideoBriefAction,
} from "@/presentation/actions/projects";
import { composeReelAction } from "@/presentation/actions/reel";
import { isProjectBusy } from "@/service/clip-stage";
import { mergePolledProject, projectWithClearedFrames } from "@/util/optimistic-frames";
import { isReelBusy } from "@/service/reel/fingerprint";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { DEFAULT_VOICE_GENDER, VOICE_PRESETS } from "@/service/director/voice";
import { SCENE_TEXT_PRESETS } from "@/service/director/scene-text";
import {
  requiredCastCount,
  skillBansNarration,
  skillForcesSceneText,
} from "@/service/director/skill-rules";
import { failedStepFor, isProductionLike } from "@/service/project-status";
import type { PublicCharacter, PublicSkill, PublicStyle, PublicVideo } from "@/presentation/serialize";
import { DEFAULT_STYLE_ID, type StyleId } from "@/service/style";
import type {
  AspectRatio,
  ClipStoryboardInput,
  DurationPreset,
  FramePosition,
  FrameRevisionInput,
  SceneTextLanguage,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
import { CharacterPicker } from "@/presentation/components/app/projects/[id]/character-picker";
import { SkillPicker } from "@/presentation/components/app/projects/[id]/skill-picker";
import { AspectRatioPicker } from "@/presentation/components/app/projects/new/aspect-ratio-picker";
import { DirectorProgress } from "@/presentation/components/app/projects/new/director-progress";
import { DurationPicker } from "@/presentation/components/app/projects/new/duration-picker";
import { LanguagePicker } from "@/presentation/components/app/projects/new/language-picker";
import { VoicePicker } from "@/presentation/components/app/projects/new/voice-picker";
import { SceneTextPicker } from "@/presentation/components/app/projects/new/scene-text-picker";
import { ReelExport } from "@/presentation/components/app/projects/new/reel-export";
import { ReviseStoryboardDialog } from "@/presentation/components/app/projects/new/revise-storyboard-dialog";
import { useProjectPoll } from "@/presentation/components/app/projects/new/use-project-poll";

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
  onStepNav,
}: {
  projectId: string;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  initialVideo?: PublicVideo | null;
  credits: number;
  subscribed: boolean;
  onVideoCreated?: (video: PublicVideo) => void;
  onStepNav?: (nav: EditorStepNav | null) => void;
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
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(
    initialVideo?.voiceGender || DEFAULT_VOICE_GENDER,
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
      project.voiceGender === voiceGender &&
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
    formData.set("voiceGender", voiceGender);
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
    if (castNeed > 0 && characterIds.length !== castNeed) {
      setError(`這個導演需要正好 ${castNeed} 個角色`);
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

  // 全部產生: fill gaps, redraw every frame, or redraw + auto video.
  function onBulkGenerate(mode: BulkMode) {
    if (!project) return Promise.resolve(false);
    const action =
      mode === "remaining"
        ? generateRemainingAction
        : mode === "scenes"
          ? generateAllSceneImagesAction
          : generateAllClipsAction;
    return runPaid("bulk", () => action(project.id));
  }

  // Filmstrip multi-select: frames or videos for the checked clips.
  function onGenerateSelected(clipNumbers: number[], kind: "frames" | "videos") {
    if (!project) return Promise.resolve(false);
    return runPaid("bulk", () => generateSelectedClipsAction(project.id, clipNumbers, kind));
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
  const castNeed = requiredCastCount(skillSlug);
  const forceSceneText = skillForcesSceneText(skillSlug);
  const dialogueOnly = skillBansNarration(skillSlug);

  useEffect(() => {
    if (castNeed > 0) {
      setCharacterIds((ids) => (ids.length > castNeed ? ids.slice(0, castNeed) : ids));
    }
  }, [castNeed]);

  function onStyleChange(id: StyleId) {
    setStyleId(id);
    setCharacterIds((ids) =>
      ids.filter((cid) => characters.find((c) => c.id === cid)?.styleId === id),
    );
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
  const requestedViewing =
    viewingOverride &&
    viewingOverride.id === liveId &&
    viewingOverride.status === liveStatus
      ? viewingOverride.step
      : liveStep;
  // Create stays on the brief. An existing video never returns to Input.
  const viewing = project ? Math.max(requestedViewing, 1) : 0;

  const pinViewingStep = useCallback(
    (step: number) => {
      setViewingOverride({ id: liveId, status: liveStatus, step });
    },
    [liveId, liveStatus],
  );
  const briefBusy =
    submitting || Boolean(project && (isProjectBusy(project) || isReelBusy(project.reelStatus)));
  const clipsReady = project?.status === "ready";
  const failedAtStep = project?.status === "failed" ? failedStepFor(project) : undefined;

  useEffect(() => {
    if (!project) {
      onStepNav?.(null);
      return;
    }
    onStepNav?.({
      status: liveStatus,
      failedAtStep,
      viewing,
      clipsReady,
      onSelectStep: pinViewingStep,
    });
  }, [clipsReady, failedAtStep, liveStatus, onStepNav, pinViewingStep, project, viewing]);

  useEffect(() => {
    return () => onStepNav?.(null);
  }, [onStepNav]);

  const canSubmit =
    source.trim().length > 0 &&
    aspectRatio !== "" &&
    skillSlug !== "" &&
    (castNeed === 0 || characterIds.length === castNeed) &&
    !briefBusy;
  const fillEditor =
    viewing === 1 && Boolean(project?.phaseA && isProductionLike(project.status));
  const reelDesk = viewing === 2 && project?.status === "ready";
  const desk = fillEditor || reelDesk;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={
            desk
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 flex-1 space-y-6 overflow-y-auto"
          }
        >
        <AnimatePresence mode="wait" initial={false}>
          {viewing === 0 ? (
            <StudioPanel key="form" className="mx-auto w-full max-w-3xl">
            <motion.form
              key="form"
              onSubmit={onSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, ease }}
              className="space-y-7 p-6 sm:p-8"
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

              <Section
                step="03"
                title={dialogueOnly ? "對白語言與聲線" : "旁白語言與聲線"}
                hint={
                  dialogueOnly
                    ? "角色用這個語言與聲線說話；這支短片沒有旁白。分鏡說明維持繁體中文。"
                    : "影片會用這個語言與男／女聲配旁白；分鏡說明維持繁體中文。"
                }
              >
                <LanguagePicker value={language} onChange={setLanguage} disabled={briefBusy} />
                <p className="mt-4 text-sm font-semibold">{dialogueOnly ? "對白聲線" : "旁白聲線"}</p>
                <p className="mt-1 text-xs text-muted">
                  {dialogueOnly
                    ? "產片時角色對白會用這個成年聲線。"
                    : "產片時旁白會鎖定這個成年聲線，全程不換性別。"}
                </p>
                <div className="mt-3">
                  <VoicePicker value={voiceGender} onChange={setVoiceGender} disabled={briefBusy} />
                </div>
              </Section>

              <Section
                step="04"
                title="畫面文字"
                hint={
                  forceSceneText
                    ? "清單式導演會在畫面列出項目文字，選擇文字語言。"
                    : "每張分鏡圖都會寫上畫面文字，選擇文字語言。"
                }
              >
                <SceneTextPicker
                  language={sceneTextLanguage}
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

              <Section
                step="07"
                title="角色"
                hint={
                  castNeed === 2
                    ? "必選正好 2 個角色：提問者與回答者。分鏡與分鏡圖會鎖定這些藍圖。"
                    : "選填。最多 4 個；分鏡與分鏡圖會鎖定這些角色的藍圖。"
                }
              >
                <CharacterPicker
                  characters={characters}
                  styleId={styleId}
                  value={characterIds}
                  onChange={setCharacterIds}
                  disabled={briefBusy}
                  max={castNeed > 0 ? castNeed : 4}
                  required={castNeed}
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
                <p className="text-xs text-muted">
                  {project
                    ? "改題材會重寫分鏡並回到製作。已產生的畫格與影片會留著，但可能對不上。"
                    : "這一步不扣 credits。分鏡寫好後會直接進入製作，產畫格與影片才扣款。"}
                </p>
              </div>
            </motion.form>
            </StudioPanel>
          ) : (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.35, ease }}
              className={`flex flex-wrap items-center gap-2 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-2 text-xs ${
                desk ? "shrink-0" : "mx-4 mt-4 rounded-md border sm:mx-6"
              }`}
            >
              <span className="font-display font-bold">{skillTitle}</span>
              <Dot />
              <span>{styleName}</span>
              <Dot />
              <span>{LANGUAGE_PRESETS[language].label}</span>
              <Dot />
              <span>{VOICE_PRESETS[voiceGender].label}</span>
              <Dot />
              <span>
                {`畫面文字 · ${SCENE_TEXT_PRESETS[sceneTextLanguage].label}`}
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
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {viewing === 1 && project?.status === "phase_a" ? (
            <DirectorProgress key="phase-a" />
          ) : fillEditor && project ? (
            <div key="production" className="flex min-h-0 flex-1 flex-col">
            <ClipProduction
              project={project}
              credits={credits}
              pending={pending}
              error={error}
              onGenerateFrames={onGenerateFrames}
              onRegenerateFrame={onRegenerateFrame}
              onUpdateClip={onUpdateClip}
              onGenerateVideo={onGenerateVideo}
              onBulkGenerate={onBulkGenerate}
              onGenerateSelected={onGenerateSelected}
            />
            </div>
          ) : reelDesk && project ? (
            <VideoDesk
              key={project.id}
              project={project}
              pending={pending}
              renderPreview={() => (
                <ReelExport
                  part="preview"
                  project={project}
                  pending={pending}
                  error={error}
                  onCompose={onComposeReel}
                />
              )}
              renderInspector={() => (
                <ReelExport
                  part="inspector"
                  project={project}
                  pending={pending}
                  error={error}
                  onCompose={onComposeReel}
                />
              )}
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
        </div>

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
