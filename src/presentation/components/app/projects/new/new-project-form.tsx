"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorStepNav } from "@/presentation/components/app/projects/[id]/editor-step-switch";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ClipProduction } from "@/presentation/components/project/clip-production";
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
import {
  cheapestVideoCost,
  clipVideoCost,
  needsVideoUpgrade,
  planGenerateAllClips,
  planGenerateAllScenes,
  planRemaining,
  planSelected,
} from "@/service/production-plan";
import { UpgradePlanDialog } from "@/presentation/components/app/projects/new/upgrade-plan-dialog";
import {
  costForPaidKey,
  paidActionProject,
  type PaidActionResult,
} from "@/presentation/components/app/projects/new/paid-action";
import { mergePolledProject, projectWithClearedFrames } from "@/util/optimistic-frames";
import {
  generationTransitions,
  transitionKey,
  transitionMessage,
  type GenerationTransition,
} from "@/util/generation-transitions";
import { ToastStack, useToasts } from "@/presentation/components/toast-stack";
import {
  holdOptimisticTasks,
  paidKeyTasks,
  releaseOptimisticTasks,
} from "@/presentation/components/app/tasks/optimistic-tasks";
import { beginTaskRefresh, endTaskRefresh } from "@/presentation/components/app/tasks/task-refresh";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
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
  SpeechPace,
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
import { SpeechPacePicker } from "@/presentation/components/app/projects/new/speech-pace-picker";
import { DEFAULT_SPEECH_PACE, SPEECH_PACE_PRESETS } from "@/service/director/speech-pace";
import { SceneTextPicker } from "@/presentation/components/app/projects/new/scene-text-picker";
import { VideoEditDesk } from "@/presentation/components/app/projects/new/video-edit-desk";
import { ReviseStoryboardDialog } from "@/presentation/components/app/projects/new/revise-storyboard-dialog";
import { useProjectPoll } from "@/presentation/components/app/projects/new/use-project-poll";

const ease = [0.22, 1, 0.36, 1] as const;

// Whole create → director → produce → export flow lives on this one page.
function queueKeysForPlan(plan: { frames: number[]; videos: number[] }) {
  return [
    ...plan.frames.map((clipNumber) => `frames:${clipNumber}`),
    ...plan.videos.map((clipNumber) => `video:${clipNumber}`),
  ];
}

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
  const [speechPace, setSpeechPace] = useState<SpeechPace>(
    initialVideo?.speechPace || DEFAULT_SPEECH_PACE,
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
  // Video cost shown in the upgrade overlay; set when the wallet cannot pay for it.
  const [upgradeCost, setUpgradeCost] = useState<number | null>(null);
  // Header RSC credits stay stale until poll; keep a local wallet for gates.
  const [walletCredits, setWalletCredits] = useState(credits);
  // Previous stills, restored if the redo action never reaches the server.
  const redoSnapshotRef = useRef<PublicVideo | null>(null);
  const creditsSnapshotRef = useRef(credits);

  useEffect(() => {
    setWalletCredits(credits);
  }, [credits]);

  // Background jobs finish while the user is elsewhere: announce each settled
  // frame / video with a toast (thumbnail on success) as the poll lands it.
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  // Collected inside the state updater (keyed, so StrictMode's double run is
  // harmless) and flushed once the merged project has committed.
  const settledRef = useRef(new Map<string, GenerationTransition>());
  const onPollUpdate = useCallback((next: PublicVideo) => {
    setProject((current) => {
      if (!current) return next;
      const merged = mergePolledProject(current, next);
      for (const item of generationTransitions(current, merged)) {
        settledRef.current.set(transitionKey(item), item);
      }
      return merged;
    });
  }, []);
  useEffect(() => {
    if (settledRef.current.size === 0) return;
    const settled = [...settledRef.current.values()];
    settledRef.current.clear();
    // Finished jobs leave the pending count; refresh the meters right away.
    notifyTasksChanged();
    for (const item of settled) {
      pushToast({
        tone: item.outcome === "completed" ? "success" : "error",
        title: transitionMessage(item),
        media:
          item.outcome === "completed" && item.mediaUrl
            ? { kind: item.kind === "video" ? "video" : "image", url: item.mediaUrl }
            : undefined,
      });
    }
  }, [project, pushToast]);
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
      project.speechPace === speechPace &&
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
    formData.set("speechPace", speechPace);
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
    action: () => Promise<PaidActionResult>,
    spend = costForPaidKey(key),
    queueKeys?: string[],
  ) {
    setPending(key);
    setError("");
    creditsSnapshotRef.current = walletCredits;
    if (spend > 0) setWalletCredits((current) => current - spend);
    // Hide the old still/video immediately; the server write lands a moment later.
    // Bulk passes one key per clip so the production queue flips with the click.
    const clearKeys = queueKeys ?? [key];
    setProject((current) => {
      if (!current) return current;
      let next = current;
      for (const item of clearKeys) next = projectWithClearedFrames(next, item);
      redoSnapshotRef.current = next === current ? null : current;
      return next;
    });
    // Queue row + spinner before the server action returns.
    const held = project
      ? holdOptimisticTasks(
          paidKeyTasks({
            videoId: project.id,
            projectId: project.projectId,
            title: project.phaseA?.localizedTitle || "未命名影片",
            keys: queueKeys ?? [key],
          }),
        )
      : [];
    beginTaskRefresh();
    notifyTasksChanged();
    try {
      const result = await action();
      setPending("");
      if (!result.ok) {
        releaseOptimisticTasks(held);
        setWalletCredits(creditsSnapshotRef.current);
        if (redoSnapshotRef.current) {
          setProject(redoSnapshotRef.current);
          redoSnapshotRef.current = null;
        }
        setError(result.error);
        notifyTasksChanged();
        if (result.error.includes("訂閱") || result.error.includes("credits 不足")) {
          router.push("/app/billing");
        }
        return false;
      }
      redoSnapshotRef.current = null;
      // Job rows exist now: replace the click-time queue with the server list.
      notifyTasksChanged();
      const nextProject = paidActionProject(result);
      if (nextProject) {
        setProject(nextProject);
        // Bulk / rewrite still return a full snapshot; refresh lists and wallet.
        router.refresh();
      }
      return true;
    } finally {
      endTaskRefresh();
    }
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

  // Rewrite one clip's storyboard text; optionally redraw its two frames (FRAMES_COST).
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

  // Per-clip production: both frames, one video, or fill every gap.
  function onGenerateFrames(clipNumber: number) {
    if (!project) return;
    void runPaid(`frames:${clipNumber}`, () =>
      generateClipFramesAction(project.id, clipNumber),
    );
  }

  function onGenerateVideo(clipNumber: number) {
    if (!project) return;
    // Billed per second of this clip's storyboard duration.
    const cost = clipVideoCost(project, clipNumber);
    if (needsVideoUpgrade(walletCredits, cost)) {
      setUpgradeCost(cost);
      return;
    }
    void runPaid(`video:${clipNumber}`, () => generateClipVideoAction(project.id, clipNumber), cost);
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
    const key = mode === "remaining" ? "remaining" : mode === "scenes" ? "all-scenes" : "all-clips";
    const plan =
      mode === "remaining"
        ? planRemaining(project)
        : mode === "scenes"
          ? planGenerateAllScenes(project)
          : planGenerateAllClips(project);
    const cheapest = cheapestVideoCost(project, plan.videos);
    if (plan.videos.length > 0 && needsVideoUpgrade(walletCredits, cheapest)) {
      setUpgradeCost(cheapest);
      return Promise.resolve(false);
    }
    return runPaid(key, () => action(project.id), plan.cost, queueKeysForPlan(plan));
  }

  // Filmstrip multi-select: frames or videos for the checked clips.
  function onGenerateSelected(clipNumbers: number[], kind: "frames" | "videos") {
    if (!project) return Promise.resolve(false);
    if (kind === "videos") {
      const cheapest = cheapestVideoCost(project, planSelected(project, clipNumbers, kind).videos);
      if (needsVideoUpgrade(walletCredits, cheapest)) {
        setUpgradeCost(cheapest);
        return Promise.resolve(false);
      }
    }
    return runPaid(
      "bulk",
      () => generateSelectedClipsAction(project.id, clipNumbers, kind),
      0,
      queueKeysForPlan(planSelected(project, clipNumbers, kind)),
    );
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
  const directorBusy = viewing === 1 && project?.status === "phase_a";
  const desk = fillEditor || reelDesk;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={
            desk || directorBusy
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
                <p className="mt-5 text-sm font-semibold">角色</p>
                <p className="mt-1 text-xs text-muted">
                  {castNeed === 2
                    ? "必須正好選 2 個角色（提問者與回答者），少一個或多一個都不能開始。只顯示與上方風格相同的角色。"
                    : "選填。最多 4 個；只顯示與上方風格相同的角色。"}
                </p>
                <div className="mt-3">
                  <CharacterPicker
                    characters={characters}
                    styleId={styleId}
                    value={characterIds}
                    onChange={setCharacterIds}
                    disabled={briefBusy}
                    max={castNeed > 0 ? castNeed : 4}
                    required={castNeed}
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
                title={dialogueOnly ? "對白語言與語速" : "旁白語言、語速與聲線"}
                hint={
                  dialogueOnly
                    ? "角色用這個語言、這個語速說話；聲線在產片時依角色外貌自動決定。這個導演沒有旁白。分鏡說明維持繁體中文。"
                    : "影片會用這個語言、語速與男／女聲配旁白；分鏡說明維持繁體中文。"
                }
              >
                <LanguagePicker value={language} onChange={setLanguage} disabled={briefBusy} />
                <p className="mt-4 text-sm font-semibold">語速</p>
                <p className="mt-1 text-xs text-muted">
                  影響每段講多少字：慢速字數較少、句間有停頓；快速字數較多。
                </p>
                <div className="mt-3">
                  <SpeechPacePicker value={speechPace} onChange={setSpeechPace} disabled={briefBusy} />
                </div>
                {dialogueOnly ? null : (
                  <>
                    <p className="mt-4 text-sm font-semibold">旁白聲線</p>
                    <p className="mt-1 text-xs text-muted">
                      產片時旁白會鎖定這個成年聲線，全程不換性別。
                    </p>
                    <div className="mt-3">
                      <VoicePicker value={voiceGender} onChange={setVoiceGender} disabled={briefBusy} />
                    </div>
                  </>
                )}
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
                  {castNeed > 0 && characterIds.length !== castNeed
                    ? `請先選正好 ${castNeed} 個角色，才能開始。`
                    : project
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
              <span>{`語速 · ${SPEECH_PACE_PRESETS[speechPace].label}`}</span>
              {dialogueOnly ? null : (
                <>
                  <Dot />
                  <span>{VOICE_PRESETS[voiceGender].label}</span>
                </>
              )}
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
          {directorBusy ? (
            <div key="phase-a" className="grid min-h-0 flex-1 place-items-center px-6">
              <DirectorProgress />
            </div>
          ) : fillEditor && project ? (
            <div key="production" className="flex min-h-0 flex-1 flex-col">
            <ClipProduction
              project={project}
              credits={walletCredits}
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
            <VideoEditDesk
              key={project.id}
              project={project}
              pending={pending}
              error={error}
              onComposeReel={onComposeReel}
              onProjectChange={setProject}
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

        {upgradeCost !== null ? (
          <UpgradePlanDialog videoCost={upgradeCost} onClose={() => setUpgradeCost(null)} />
        ) : null}
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
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
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
