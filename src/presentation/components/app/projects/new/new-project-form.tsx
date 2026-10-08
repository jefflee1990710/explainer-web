"use client";

import { useRouter } from "next/navigation";
import { folderPath, folderVideoPath } from "@/service/folder-video-path";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorStepSwitch, type EditorStepNav } from "@/presentation/components/app/projects/[id]/editor-step-switch";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ClipProduction } from "@/presentation/components/project/clip-production";
import { StudioPanel } from "@/presentation/studio/studio-panel";
import { currentStepFor } from "@/presentation/components/project/project-stepper";
import { Spinner } from "@/presentation/components/spinner";
import { StylePicker } from "@/presentation/components/style-picker";
import {
  generateAllClipsAction,
  generateAllSceneImagesAction,
  cancelPendingClipVideoAction,
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
  restartVideoAction,
  retryProjectAction,
  updateVideoBriefAction,
  updateVideoTextStyleAction,
} from "@/presentation/actions/projects";
import { isProjectBusy } from "@/service/clip-stage";
import {
  cheapestVideoCost,
  clipVideoCost,
  needsVideoUpgrade,
  planGenerateAllVideos,
  planGenerateAllScenes,
  planRemaining,
  planSelected,
} from "@/service/production-plan";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { isCreditGateError } from "@/service/billing/credit-gate";
import {
  costForPaidKey,
  paidActionProject,
  type PaidActionResult,
} from "@/presentation/components/app/projects/new/paid-action";
import { mergePolledProject, projectWithClearedFrames } from "@/util/optimistic-frames";
import { generationTransitions } from "@/util/generation-transitions";
import {
  holdOptimisticTasks,
  paidKeyTasks,
  releaseOptimisticTasks,
} from "@/presentation/components/app/tasks/optimistic-tasks";
import { beginTaskRefresh, endTaskRefresh } from "@/presentation/components/app/tasks/task-refresh";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { isReelBusy } from "@/service/reel/fingerprint";
import { durationPresetLabel } from "@/util/i18n/picker-labels";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { DEFAULT_VOICE_GENDER, VOICE_PRESETS } from "@/service/director/voice";
import { SCENE_TEXT_PRESETS } from "@/service/director/scene-text";
import { DEFAULT_SUBTITLE_LOOK, isSubtitleLook } from "@/service/director/subtitle-look";
import { TextStylePicker } from "@/presentation/components/app/projects/new/text-style-picker";
import {
  isBookendSkill,
  requiredCastCount,
  skillBansNarration,
  skillForcesSceneText,
} from "@/service/director/skill-rules";
import { isTalkingHeadSkill, talkingHeadScriptFromClips } from "@/service/director/talking-head";
import { TalkingHeadScriptField } from "@/presentation/components/app/projects/new/talking-head-script-field";
import { failedStepFor, isProductionLike } from "@/service/project-status";
import type {
  PublicCharacter,
  PublicProduct,
  PublicSkill,
  PublicStyle,
  PublicTextStyle,
  PublicVideo,
} from "@/presentation/serialize";
import { DEFAULT_STYLE_ID } from "@/service/style";
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
import { ProductDropdown } from "@/presentation/components/app/projects/new/product-dropdown";
import { SkillPicker } from "@/presentation/components/app/projects/[id]/skill-picker";
import { AspectRatioPicker } from "@/presentation/components/app/projects/new/aspect-ratio-picker";
import { DirectorProgress } from "@/presentation/components/app/projects/new/director-progress";
import { DurationPicker } from "@/presentation/components/app/projects/new/duration-picker";
import { LogoPicker } from "@/presentation/components/app/projects/new/logo-picker";
import { LanguagePicker } from "@/presentation/components/app/projects/new/language-picker";
import { VoicePicker } from "@/presentation/components/app/projects/new/voice-picker";
import { SpeechPacePicker } from "@/presentation/components/app/projects/new/speech-pace-picker";
import {
  readBriefDefaults,
  writeBriefDefaults,
} from "@/presentation/components/app/projects/new/brief-defaults";
import { DEFAULT_SPEECH_PACE, SPEECH_PACE_PRESETS } from "@/service/director/speech-pace";
import { SceneTextPicker } from "@/presentation/components/app/projects/new/scene-text-picker";
import { VideoEditDesk } from "@/presentation/components/app/projects/new/video-edit-desk";
import { VideoEditSummaryEndSlot } from "@/presentation/components/app/projects/new/video-edit-summary-end";
import { ReviseStoryboardDialog } from "@/presentation/components/app/projects/new/revise-storyboard-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { localizedVideoType } from "@/util/video-type-i18n";
import { localizedStyleName } from "@/util/style-i18n";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { sceneTextLangLabel, speechPaceLabel } from "@/util/i18n/picker-labels";
import { useProjectPoll } from "@/presentation/components/app/projects/new/use-project-poll";
import {
  ruleSlugFor,
  selectedSkillSlugFor,
} from "@/presentation/components/app/projects/new/skill-selection";
import {
  ReferenceImagesField,
  type ReferenceImageDraft,
} from "@/presentation/components/app/projects/new/reference-images-field";

const ease = [0.22, 1, 0.36, 1] as const;

// Whole create → director → produce → export flow lives on this one page.
function queueKeysForPlan(plan: { frames: number[]; videos: number[] }) {
  return [
    ...plan.frames.map((clipNumber) => `frames:${clipNumber}`),
    ...plan.videos.map((clipNumber) => `video:${clipNumber}`),
  ];
}

function chosenTextStyleId(
  video: PublicVideo | null | undefined,
  remembered: string | undefined,
  styles: PublicTextStyle[],
) {
  const id = video?.textStyleId || remembered || video?.subtitleLook || DEFAULT_SUBTITLE_LOOK;
  if (isSubtitleLook(id) || styles.some((style) => style.id === id)) return id;
  return video?.subtitleLook || DEFAULT_SUBTITLE_LOOK;
}

export function NewProjectForm({
  projectId,
  skills,
  styles,
  characters,
  products,
  textStyles,
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
  products: PublicProduct[];
  textStyles: PublicTextStyle[];
  initialVideo?: PublicVideo | null;
  credits: number;
  subscribed: boolean;
  onVideoCreated?: (video: PublicVideo) => void;
  onStepNav?: (nav: EditorStepNav | null) => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  // New-video dialog recalls this folder's last picks; never the script.
  const lastBrief = initialVideo
    ? undefined
    : readBriefDefaults(projectId, { skills, styles, characters, textStyles });

  // Form fields
  const rememberedSkill = lastBrief?.skillSlug;
  const [skillSlug, setSkillSlug] = useState(
    (initialVideo && selectedSkillSlugFor(initialVideo, skills)) ||
      (rememberedSkill && skills.some((skill) => skill.slug === rememberedSkill) ? rememberedSkill : "") ||
      skills[0]?.slug ||
      "",
  );
  // Picked director; form rules follow its behaviour (template) slug.
  const selectedSkill = skills.find((item) => item.slug === skillSlug);
  const ruleSlug = ruleSlugFor(skillSlug, skills);
  // Visual style; the cast must share it, so changing it prunes mismatches.
  const [styleId, setStyleId] = useState<string>(
    initialVideo?.styleId || lastBrief?.styleId || DEFAULT_STYLE_ID,
  );
  const [source, setSource] = useState(initialVideo?.source || "");
  const [spokenScript, setSpokenScript] = useState(
    initialVideo?.spokenScript ||
      (isTalkingHeadSkill(initialVideo?.skillSlug)
        ? talkingHeadScriptFromClips(initialVideo?.phaseA?.clips || [])
        : ""),
  );
  const [language, setLanguage] = useState<VoLanguage>(
    initialVideo?.language || lastBrief?.language || "en",
  );
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(
    initialVideo?.voiceGender || lastBrief?.voiceGender || DEFAULT_VOICE_GENDER,
  );
  const [speechPace, setSpeechPace] = useState<SpeechPace>(
    initialVideo?.speechPace || lastBrief?.speechPace || DEFAULT_SPEECH_PACE,
  );
  const [sceneTextLanguage, setSceneTextLanguage] = useState<SceneTextLanguage>(
    initialVideo?.sceneTextLanguage || lastBrief?.sceneTextLanguage || "en",
  );
  const [textStyleId, setTextStyleId] = useState(() =>
    chosenTextStyleId(initialVideo, lastBrief?.textStyleId, textStyles),
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | "">(
    initialVideo?.aspectRatio || lastBrief?.aspectRatio || "",
  );
  // New videos start on Auto. A saved video keeps the length it was created with.
  const [durationPreset, setDurationPreset] = useState<DurationPreset>(
    initialVideo?.durationPreset || "auto",
  );
  const [characterIds, setCharacterIds] = useState<string[]>(
    initialVideo?.cast.map((member) => member.characterId) || lastBrief?.characterIds || [],
  );
  const [productIds, setProductIds] = useState<string[]>(
    initialVideo?.products?.map((item) => item.productId) || [],
  );
  // Opening / Ending only: brand logo used in both scene images.
  const [logoUrl, setLogoUrl] = useState(initialVideo?.logoUrl || "");
  const [referenceImages, setReferenceImages] = useState<ReferenceImageDraft[]>(
    () => toReferenceDrafts(initialVideo?.referenceImages),
  );
  const bookend = isBookendSkill(ruleSlug);
  const talkingHead = isTalkingHeadSkill(ruleSlug);

  // Flow state. The stepper can jump back to 題材 after a video exists.
  const [project, setProject] = useState<PublicVideo | null>(initialVideo);
  const [submitting, setSubmitting] = useState(false);
  // "" | "retry" | "remaining" | "reel"
  // | frames:{n} | frame:{n}:{pos} | video:{n} | clip:{n}[:regen]
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  // Pinned to the video + status that was current when the user clicked a step.
  // A finished video opens on Video (step 2). Production stays the default until then.
  const [viewingOverride, setViewingOverride] = useState<{
    id: string | null;
    status: string;
    step: number;
  } | null>(() =>
    initialVideo?.status === "ready"
      ? { id: initialVideo.id, status: "ready", step: 2 }
      : null,
  );
  const [confirmBrief, setConfirmBrief] = useState(false);
  // 重新開始: brief form shown again for an existing video; submit wipes and reruns Phase A.
  const [restarting, setRestarting] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  // Shown when the wallet cannot pay; resume is the generate click to retry.
  const [creditGate, setCreditGate] = useState<{
    needed: number;
    resume: () => void;
  } | null>(null);
  // Header RSC credits stay stale until poll; keep a local wallet for gates.
  const [walletCredits, setWalletCredits] = useState(credits);
  const [paidSubscribed, setPaidSubscribed] = useState<boolean | null>(null);
  const walletSubscribed = paidSubscribed ?? subscribed;
  // Previous stills, restored if the redo action never reaches the server.
  const redoSnapshotRef = useRef<PublicVideo | null>(null);
  const creditsSnapshotRef = useRef(credits);

  useEffect(() => {
    setWalletCredits(credits);
  }, [credits]);

  // A settled frame or clip should refresh the task list immediately so the
  // browser notification can fire without waiting for the next 5s tick.
  const settledRef = useRef(false);
  const onPollUpdate = useCallback((next: PublicVideo) => {
    setProject((current) => {
      if (!current) return next;
      const merged = mergePolledProject(current, next);
      if (generationTransitions(current, merged).length > 0) settledRef.current = true;
      return merged;
    });
  }, []);
  useEffect(() => {
    if (!settledRef.current) return;
    settledRef.current = false;
    notifyTasksChanged();
  }, [project]);
  const onPollError = useCallback((message: string) => setError(translateAppError(message, t)), [t]);
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
    const currentProducts = (project.products ?? []).map((item) => item.productId).slice().sort();
    const nextProducts = productIds.slice().sort();
    return (
      project.source === source.trim() &&
      (project.spokenScript || "") === (talkingHead ? spokenScript.trim() : "") &&
      project.skillId === selectedSkill?.id &&
      project.styleId === styleId &&
      project.language === language &&
      project.voiceGender === voiceGender &&
      project.speechPace === speechPace &&
      project.sceneTextLanguage === sceneTextLanguage &&
      (project.textStyleId || project.subtitleLook) === textStyleId &&
      project.aspectRatio === aspectRatio &&
      project.durationPreset === durationPreset &&
      (project.logoUrl || "") === (bookend ? logoUrl : "") &&
      JSON.stringify(toReferenceDrafts(project.referenceImages)) ===
        JSON.stringify(referenceImages.map((item) => ({ ...item, description: item.description.trim() }))) &&
      currentIds.length === nextIds.length &&
      currentIds.every((id, index) => id === nextIds[index]) &&
      currentProducts.length === nextProducts.length &&
      currentProducts.every((id, index) => id === nextProducts[index])
    );
  }

  function briefFormData() {
    const formData = new FormData();
    formData.set("projectId", projectId);
    if (project) formData.set("videoId", project.id);
    formData.set("skillSlug", skillSlug);
    formData.set("styleId", styleId);
    formData.set("source", source);
    if (talkingHead) formData.set("spokenScript", spokenScript);
    formData.set("language", language);
    formData.set("voiceGender", voiceGender);
    formData.set("speechPace", speechPace);
    formData.set("sceneTextLanguage", sceneTextLanguage);
    formData.set("textStyleId", textStyleId);
    formData.set("subtitleLook", isSubtitleLook(textStyleId) ? textStyleId : DEFAULT_SUBTITLE_LOOK);
    formData.set("aspectRatio", aspectRatio);
    formData.set("durationPreset", durationPreset);
    if (bookend && logoUrl) formData.set("logoUrl", logoUrl);
    formData.set("referenceImages", JSON.stringify(referenceImages));
    for (const id of characterIds) formData.append("characterIds", id);
    for (const id of productIds) formData.append("productIds", id);
    return formData;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aspectRatio) {
      setError(t("brief.error.aspectRatioRequired"));
      return;
    }
    if (castNeed > 0 && characterIds.length !== castNeed) {
      setError(t("brief.error.castCount", { n: castNeed }));
      return;
    }
    if (restarting) {
      setConfirmRestart(true);
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
      setError(translateAppError(result.error, t));
      return;
    }
    // A new video goes back to this project's list. Phase A keeps running.
    // Saving an existing brief stays on that video.
    setProject(result.project);
    onVideoCreated?.(result.project);
    router.replace(project ? folderVideoPath(projectId, result.project.id) : folderPath(projectId));
  }

  // Wipe storyboard, stills, and clip videos, then rerun Phase A from the form.
  async function submitRestart() {
    if (!project) return;
    setSubmitting(true);
    setError("");
    const result = await restartVideoAction(briefFormData());
    setSubmitting(false);
    setConfirmRestart(false);
    if (!result.ok) {
      setError(translateAppError(result.error, t));
      return;
    }
    setRestarting(false);
    setViewingOverride(null);
    setProject(result.project);
    onVideoCreated?.(result.project);
    router.refresh();
  }

  // Put the form back to this video's saved brief.
  function resetBriefFromProject(video: PublicVideo, options: PublicSkill[]) {
    setSkillSlug(selectedSkillSlugFor(video, options));
    setStyleId(video.styleId || DEFAULT_STYLE_ID);
    setSource(video.source);
    setSpokenScript(
      video.spokenScript ||
        (isTalkingHeadSkill(video.skillSlug)
          ? talkingHeadScriptFromClips(video.phaseA?.clips || [])
          : ""),
    );
    setLanguage(video.language || "en");
    setVoiceGender(video.voiceGender || DEFAULT_VOICE_GENDER);
    setSpeechPace(video.speechPace || DEFAULT_SPEECH_PACE);
    setSceneTextLanguage(video.sceneTextLanguage || "en");
    setTextStyleId(chosenTextStyleId(video, undefined, textStyles));
    setAspectRatio(video.aspectRatio);
    setDurationPreset(video.durationPreset);
    setCharacterIds(video.cast.map((member) => member.characterId));
    setProductIds((video.products ?? []).map((item) => item.productId));
    setLogoUrl(video.logoUrl || "");
    setReferenceImages(toReferenceDrafts(video.referenceImages));
  }

  const onRestart = useCallback(() => {
    if (!project) return;
    resetBriefFromProject(project, skills);
    setError("");
    setRestarting(true);
  }, [project, skills]);

  function cancelRestart() {
    if (project) resetBriefFromProject(project, skills);
    setError("");
    setRestarting(false);
  }

  function openCreditGate(needed: number, resume: () => void) {
    setCreditGate({ needed: Math.max(needed, 1), resume });
  }

  // Shared handler for every server action behind a paid button. A short wallet
  // opens the in-place checkout dialog and retries this same click after pay.
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
            title: project.phaseA?.localizedTitle || t("brief.fallback.unnamedVideo"),
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
        setError(translateAppError(result.error, t));
        notifyTasksChanged();
        if (isCreditGateError(result.error)) {
          openCreditGate(spend || 1, () => {
            void runPaid(key, action, spend, queueKeys);
          });
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
      openCreditGate(cost, () => onGenerateVideo(clipNumber));
      return;
    }
    void runPaid(`video:${clipNumber}`, () => generateClipVideoAction(project.id, clipNumber), cost);
  }

  async function onCancelVideo(clipNumber: number) {
    if (!project) return;
    setPending(`cancel-video:${clipNumber}`);
    setError("");
    const result = await cancelPendingClipVideoAction(project.id, clipNumber);
    setPending("");
    notifyTasksChanged();
    if (!result.ok) {
      setError(translateAppError(result.error, t));
      return;
    }
    setProject(result.project);
    router.refresh();
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
          : planGenerateAllVideos(project);
    const cheapest = cheapestVideoCost(project, plan.videos);
    if (plan.videos.length > 0 && needsVideoUpgrade(walletCredits, cheapest)) {
      openCreditGate(Math.max(cheapest, plan.cost), () => {
        void onBulkGenerate(mode);
      });
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
        openCreditGate(cheapest, () => {
          void onGenerateSelected(clipNumbers, kind);
        });
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

  // Failed → move back to the gate it fell over on (no charge).
  async function onRetry() {
    if (!project) return;
    setPending("retry");
    setError("");
    const result = await retryProjectAction(project.id);
    setPending("");
    if (!result.ok) setError(translateAppError(result.error, t));
    else setProject(result.project);
  }

  // Switching style drops selected characters drawn in a different style.
  const castNeed = requiredCastCount(ruleSlug);
  const forceSceneText = skillForcesSceneText(ruleSlug);
  const dialogueOnly = skillBansNarration(ruleSlug);

  useEffect(() => {
    if (castNeed > 0) {
      setCharacterIds((ids) => (ids.length > castNeed ? ids.slice(0, castNeed) : ids));
    }
  }, [castNeed]);

  useEffect(() => {
    if (!skillSlug || !aspectRatio) return;
    writeBriefDefaults(projectId, {
      skillSlug,
      styleId,
      language,
      voiceGender,
      speechPace,
      sceneTextLanguage,
      subtitleLook: isSubtitleLook(textStyleId) ? textStyleId : DEFAULT_SUBTITLE_LOOK,
      textStyleId,
      aspectRatio,
      durationPreset,
      characterIds,
    });
  }, [
    projectId,
    skillSlug,
    styleId,
    language,
    voiceGender,
    speechPace,
    sceneTextLanguage,
    textStyleId,
    aspectRatio,
    durationPreset,
    characterIds,
  ]);

  // Existing videos never reopen the brief, so the look is saved from the summary.
  async function saveTextStyle(id: string) {
    if (!project || id === textStyleId) return;
    const previous = textStyleId;
    setTextStyleId(id);
    const result = await updateVideoTextStyleAction(project.id, id);
    if (!result.ok) {
      setTextStyleId(previous);
      setError(translateAppError(result.error, t));
      return;
    }
    setProject(result.project);
    setError("");
  }

  function onStyleChange(id: string) {
    setStyleId(id);
    setCharacterIds((ids) =>
      ids.filter((cid) => {
        const character = characters.find((c) => c.id === cid);
        const styles = character?.styleIds?.length ? character.styleIds : [character?.styleId];
        return styles.includes(id);
      }),
    );
  }

  const summarySkill = skills.find((item) => item.id === project?.skillId) ?? selectedSkill;
  const skillTitle = summarySkill
    ? summarySkill.isCustom
      ? summarySkill.title
      : localizedVideoType(t, summarySkill.slug, summarySkill.title)
    : t("brief.fallback.videoType");
  const selectedStyle = styles.find((item) => item.id === (project?.styleId || styleId));
  const styleName = selectedStyle
    ? selectedStyle.isCustom
      ? selectedStyle.name
      : localizedStyleName(selectedStyle.id)
    : t("brief.fallback.visualStyle");
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
  const viewing = project && !restarting ? Math.max(requestedViewing, 1) : 0;

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
      onSelectStep: (step) => {
        setRestarting(false);
        pinViewingStep(step);
      },
      canRestart: !restarting && !briefBusy,
      onRestart,
    });
  }, [
    briefBusy,
    clipsReady,
    failedAtStep,
    liveStatus,
    onRestart,
    onStepNav,
    pinViewingStep,
    project,
    restarting,
    viewing,
  ]);

  useEffect(() => {
    return () => onStepNav?.(null);
  }, [onStepNav]);

  const canSubmit =
    source.trim().length > 0 &&
    (!talkingHead || spokenScript.trim().length > 0) &&
    aspectRatio !== "" &&
    skillSlug !== "" &&
    (castNeed === 0 || characterIds.length === castNeed) &&
    referenceImages.every((item) => item.description.trim().length > 0) &&
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

              <Section step="01" title={t("brief.section01.title")} hint={t("brief.section01.hint")}>
                <SkillPicker
                  skills={skills}
                  value={skillSlug}
                  onChange={setSkillSlug}
                  disabled={briefBusy}
                />
                {bookend ? (
                  <>
                    <p className="mt-5 text-sm font-semibold">{t("brief.logo.title")}</p>
                    <p className="mt-1 text-xs text-muted">{t("brief.logo.hint")}</p>
                    <div className="mt-3">
                      <LogoPicker
                        value={logoUrl}
                        onChange={setLogoUrl}
                        onError={setError}
                        disabled={briefBusy}
                      />
                    </div>
                    {durationPreset === "auto" ? (
                      <p className="mt-2 text-xs text-muted">{t("brief.logo.fixedLength")}</p>
                    ) : null}
                  </>
                ) : null}
                {talkingHead ? (
                  <p className="mt-3 text-xs text-muted">{t("brief.talkingHead.hint")}</p>
                ) : null}
                {/* Visual style sits under the narrative skill in the same step. */}
                <p className="mt-5 text-sm font-semibold">{t("brief.visualStyle.title")}</p>
                <p className="mt-1 text-xs text-muted">
                  {t("brief.visualStyle.hint")}
                </p>
                <div className="mt-3">
                  <StylePicker
                    styles={styles}
                    value={styleId}
                    onChange={onStyleChange}
                    disabled={briefBusy}
                  />
                </div>
                <p className="mt-5 text-sm font-semibold">{t("brief.cast.title")}</p>
                <p className="mt-1 text-xs text-muted">
                  {castNeed === 2
                    ? t("brief.cast.hintRequiredTwo")
                    : castNeed === 1
                      ? t("brief.cast.hintRequiredOne")
                      : t("brief.cast.hintOptional")}
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
                <p className="mt-5 text-sm font-semibold">{t("brief.section04.lookTitle")}</p>
                <p className="mt-1 text-xs text-muted">{t("brief.section04.lookHint")}</p>
                <div className="mt-3">
                  <TextStylePicker
                    value={textStyleId}
                    styles={textStyles}
                    onChange={setTextStyleId}
                    disabled={briefBusy}
                  />
                </div>
                <p className="mt-5 text-sm font-semibold">{t("brief.products.title")}</p>
                <p className="mt-1 text-xs text-muted">{t("brief.products.hint")}</p>
                <div className="mt-3">
                  <ProductDropdown
                    products={products}
                    value={productIds}
                    onChange={setProductIds}
                    disabled={briefBusy}
                  />
                </div>
              </Section>

              <Section step="02" title={t("brief.section02.title")} hint={t("brief.section02.hint")}>
                <label htmlFor="source" className="sr-only">
                  {t("brief.source.label")}
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
                  placeholder={t("brief.source.placeholder")}
                />
                <p className="mt-2 text-right text-xs tabular-nums text-muted">
                  {t("brief.source.charCount", { n: source.length.toLocaleString() })}
                </p>
                {talkingHead ? (
                  <TalkingHeadScriptField
                    value={spokenScript}
                    onChange={setSpokenScript}
                    disabled={briefBusy}
                  />
                ) : null}
                <ReferenceImagesField
                  value={referenceImages}
                  onChange={setReferenceImages}
                  onError={setError}
                  disabled={briefBusy}
                />
                {referenceImages.some((item) => !item.description.trim()) ? (
                  <p className="mt-2 text-xs text-muted">{t("brief.references.descriptionRequired")}</p>
                ) : null}
              </Section>

              <Section
                step="03"
                title={dialogueOnly ? t("brief.section03.titleDialogue") : t("brief.section03.titleNarration")}
                hint={
                  dialogueOnly
                    ? t("brief.section03.hintDialogue")
                    : t("brief.section03.hintNarration")
                }
              >
                <LanguagePicker
                  value={language}
                  onChange={setLanguage}
                  disabled={briefBusy}
                  dialogueOnly={dialogueOnly}
                />
                <p className="mt-4 text-sm font-semibold">{t("brief.speechPaceSection.title")}</p>
                <p className="mt-1 text-xs text-muted">
                  {t("brief.speechPaceSection.hint")}
                </p>
                <div className="mt-3">
                  <SpeechPacePicker value={speechPace} onChange={setSpeechPace} disabled={briefBusy} />
                </div>
                {dialogueOnly ? null : (
                  <>
                    <p className="mt-4 text-sm font-semibold">{t("brief.voiceSection.title")}</p>
                    <p className="mt-1 text-xs text-muted">
                      {t("brief.voiceSection.hint")}
                    </p>
                    <div className="mt-3">
                      <VoicePicker value={voiceGender} onChange={setVoiceGender} disabled={briefBusy} />
                    </div>
                  </>
                )}
              </Section>

              <Section
                step="04"
                title={t("brief.section04.title")}
                hint={
                  forceSceneText
                    ? t("brief.section04.hintListicle")
                    : t("brief.section04.hintDefault")
                }
              >
                <SceneTextPicker
                  language={sceneTextLanguage}
                  onLanguageChange={setSceneTextLanguage}
                  disabled={briefBusy}
                />
              </Section>

              <Section step="05" title={t("brief.section05.title")} hint={t("brief.section05.hint")}>
                <AspectRatioPicker
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  disabled={briefBusy}
                />
              </Section>

              {talkingHead ? null : (
                <Section step="06" title={t("brief.section06.title")} hint={t("brief.section06.hint")}>
                  <DurationPicker
                    value={durationPreset}
                    onChange={setDurationPreset}
                    disabled={briefBusy}
                  />
                </Section>
              )}

              {error ? (
                <p role="alert" className="text-sm font-medium text-accent">
                  {translateAppError(error, t)}
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
                    ? t("brief.submit.submitting")
                    : restarting
                      ? t("brief.submit.regenerate")
                      : project
                        ? t("brief.submit.saveAndRegenerateStoryboard")
                        : t("brief.submit.start")}
                </motion.button>
                {restarting ? (
                  <button
                    type="button"
                    onClick={cancelRestart}
                    disabled={submitting}
                    className="inline-flex min-h-[48px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
                  >
                    {t("common.cancel")}
                  </button>
                ) : null}
                <p className="text-xs text-muted">
                  {castNeed > 0 && characterIds.length !== castNeed
                    ? t("brief.footer.castRequired", { n: castNeed })
                    : restarting
                      ? t("brief.footer.restartWarning")
                      : project
                        ? t("brief.footer.editBriefWarning")
                        : t("brief.footer.noCharge")}
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
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 py-2 text-xs sm:px-4 ${
                desk ? "shrink-0" : "mx-3 mt-3 rounded-md border sm:mx-6 sm:mt-4"
              }`}
            >
              <EditorStepSwitch
                status={liveStatus}
                failedAtStep={failedAtStep}
                viewing={viewing}
                clipsReady={clipsReady}
                onSelectStep={(step) => {
                  setRestarting(false);
                  pinViewingStep(step);
                }}
              />
              {/* Full row under the steps on a phone, so the export button is not painted over the specs. */}
              <div className="order-last flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:order-none sm:w-auto sm:flex-1">
                <span className="font-display font-bold">{skillTitle}</span>
                <Dot />
                <span>{styleName}</span>
                <Dot />
                <span>{LANGUAGE_PRESETS[language].label}</span>
                <Dot />
                <span>{t("brief.summary.speechPace", { label: speechPaceLabel(t, speechPace).label })}</span>
                {dialogueOnly ? null : (
                  <>
                    <Dot />
                    <span>{VOICE_PRESETS[voiceGender].label}</span>
                  </>
                )}
                <Dot />
                <span>
                  {t("brief.summary.sceneText", { label: sceneTextLangLabel(t, sceneTextLanguage).label })}
                </span>
                <Dot />
                <TextStylePicker
                  compact
                  value={textStyleId}
                  styles={textStyles}
                  disabled={briefBusy}
                  onChange={(id) => void saveTextStyle(id)}
                />
                <Dot />
                <span>{aspectRatio}</span>
                <Dot />
                <span>
                  {isTalkingHeadSkill(project?.skillSlug || ruleSlug)
                    ? t("brief.summary.talkingHeadLength")
                    : isBookendSkill(project?.skillSlug || ruleSlug) && durationPreset === "auto"
                      ? t("brief.summary.bookendLength")
                      : durationPresetLabel(t, durationPreset).label}
                </span>
                {project?.logoUrl ? (
                  <>
                    <Dot />
                    <span>{t("brief.summary.logo")}</span>
                  </>
                ) : null}
                {project?.cast.length ? (
                  <>
                    <Dot />
                    <span>{project.cast.map((member) => member.name).join("、")}</span>
                  </>
                ) : null}
              </div>
              {reelDesk ? <VideoEditSummaryEndSlot /> : null}
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
              onCancelVideo={onCancelVideo}
              onBulkGenerate={onBulkGenerate}
              onGenerateSelected={onGenerateSelected}
            />
            </div>
          ) : reelDesk && project ? (
            <VideoEditDesk
              key={project.id}
              project={project}
              credits={walletCredits}
              error={error}
              onProjectChange={setProject}
              onCreditsChange={(delta) => setWalletCredits((current) => current + delta)}
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

        {creditGate ? (
          <InsufficientCreditsDialog
            needed={creditGate.needed}
            subscribed={walletSubscribed}
            onClose={() => setCreditGate(null)}
            onPaid={(snap) => {
              setWalletCredits(snap.credits);
              setPaidSubscribed(snap.subscribed);
              const resume = creditGate.resume;
              setCreditGate(null);
              resume();
            }}
          />
        ) : null}
        {confirmBrief ? (
          <ReviseStoryboardDialog
            pending={submitting}
            title={t("brief.confirm.regenerateStoryboard.title")}
            body={t("brief.confirm.regenerateStoryboard.body")}
            confirmLabel={t("brief.confirm.regenerateStoryboard.confirm")}
            onCancel={() => {
              if (!submitting) setConfirmBrief(false);
            }}
            onConfirm={() => {
              void submitBrief();
            }}
          />
        ) : null}
        {confirmRestart ? (
          <ReviseStoryboardDialog
            pending={submitting}
            title={t("brief.confirm.restart.title")}
            body={t("brief.confirm.restart.body")}
            confirmLabel={t("brief.confirm.restart.confirm")}
            pendingLabel={t("brief.confirm.restart.pending")}
            onCancel={() => {
              if (!submitting) setConfirmRestart(false);
            }}
            onConfirm={() => {
              void submitRestart();
            }}
          />
        ) : null}
      </div>
    </MotionConfig>
  );
}

// Saved images → editable rows (ids are reassigned server-side).
function toReferenceDrafts(images: PublicVideo["referenceImages"] | undefined): ReferenceImageDraft[] {
  return (images || []).map((image) => ({ url: image.url, description: image.description }));
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
  const { t } = useI18n();
  // Only Phase A can fail at project level now; anything further back is a
  // per-clip failure the user redoes inside the production workspace.
  const label = project.phaseA ? t("brief.failed.retryToProduction") : t("brief.failed.retryRegenerateStoryboard");
  return (
    <motion.section
      role="alert"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      className="rounded-[1.5rem] border border-accent/40 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(255,77,46,0.35)]"
    >
      <p className="font-display text-lg font-bold text-accent">{t("brief.failed.title")}</p>
      <p className="mt-2 text-sm text-muted">{translateAppError(project.error || t("brief.failed.retryDefault"), t)}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={pending !== ""}
        className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 py-2 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? <Spinner /> : null}
        {label}
      </button>
      <p className="mt-3 text-xs text-muted">{t("brief.failed.creditsRefunded")}</p>
    </motion.section>
  );
}

function Dot() {
  return <span aria-hidden className="h-1 w-1 rounded-full bg-accent-ink/30" />;
}
