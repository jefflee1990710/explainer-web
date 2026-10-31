import {
  charactersCollection,
  saveClipPhaseBPrompt,
  textStylesCollection,
  directorsCollection,
  videosCollection,
} from "@/dao";
import { userStylesCollection } from "@/dao/user-styles";
import {
  sendCharacterFullBody,
  sendCharacterProfile,
  sendCharacterVersion,
} from "@/service/character/generate";
import { withCurrentCharacterVoices } from "@/service/character/voice-cast";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { loadStoredSkill } from "@/service/director/load-skill";
import { MissingTemplateError, resolveRunSkill } from "@/service/director/run-skill";
import { videoKeyframeUrls } from "@/service/higgsfield/clip-keyframes";
import { clipEndIsNextStart, clipSkipsEndStill } from "@/service/director/steady-stills";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { submitImage } from "@/service/higgsfield/generate";
import { hydrateStyles } from "@/service/style/load-style";
import { renderableFromUserStyle } from "@/service/style/renderable-style";
import { directorPreviewImagePrompt } from "@/service/director/director-preview";
import { stylePreviewPrompt } from "@/service/style/user-style-preview";
import {
  textStyleSamplePrompt,
} from "@/service/text-style/preview";
import { resolveTextStyleLookLine } from "@/service/text-style/look-line";
import type { TextStyleDoc } from "@/model/text-style";
import { sendReelCover } from "@/service/video-edit/reel-cover";
import { isTalkingHeadSkill, TALKING_HEAD_SKILL_SLUG } from "@/service/director/talking-head";
import { usesTalkingHeadSubtitleOverlay } from "@/service/director/subtitle-plate";
import { dropInventedSubtitleLock, resolveSceneText, storyboardAsksForSubtitle } from "@/service/director/scene-text";
import { sendClipVideo, sendFrame, sendStill } from "@/service/higgsfield/pipeline";
import { sendSubtitlePlate } from "@/service/higgsfield/subtitle-plate-job";
import { sendOnscreenText } from "@/service/opencut/on-screen-text";
import {
  sendBackgroundPlate,
  sendObjectSheet,
} from "@/service/higgsfield/video-locks-pipeline";
import { sendPostPreview } from "@/service/post/send-preview";
import { sendPoseEdit } from "@/service/pose-edit/send";
import { loadProduct, sendProductBlueprint } from "@/service/product/generate";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { PermanentJobError } from "@/service/generation/task-policy";
import { toSent, type Sent } from "@/service/generation/sent";
import type { Character } from "@/model/character";
import type { GenerationJob } from "@/model/generation-job";
import type { Project } from "@/model/project";

// Load fresh state and call the provider for one claimed job.
export async function sendJob(job: GenerationJob): Promise<Sent> {
  if (job.kind === "postPreview") return sendPostPreview(job);
  if (job.kind === "product") {
    if (!job.productId) throw new PermanentJobError("找不到產品");
    const product = await loadProduct(job.productId);
    if (!product) throw new PermanentJobError("找不到產品");
    return sendProductBlueprint(product);
  }
  if (job.kind === "stylePreview") return sendStylePreview(job);
  if (job.kind === "textStylePreview") return sendTextStylePreview(job);
  if (job.kind === "directorPreview") return sendDirectorPreview(job);
  // Pose edits have no project id, so they must leave before the video guard.
  if (job.kind === "poseEdit") return sendPoseEdit(job);
  await hydrateStyles();
  if (job.kind === "character") return sendCharacter(job);

  if (!job.projectId) throw new PermanentJobError("任務缺少影片");
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: job.projectId });
  if (!project) throw new PermanentJobError("影片已不存在");

  if (job.kind === "still") return sendStill(project);
  if (job.kind === "objectSheet") return sendObjectSheet(project);
  if (job.kind === "backgroundPlate") {
    if (!job.backgroundSetId) throw new PermanentJobError("找不到背景場景");
    return sendBackgroundPlate(project, job.backgroundSetId);
  }
  if (job.kind === "reelCover") return sendReelCover(project);
  const clipNumber = job.clipIndex + 1;
  if (job.kind === "frame") {
    if (!job.framePosition) throw new PermanentJobError("任務缺少畫格位置");
    return sendFrame(project, clipNumber, job.framePosition);
  }
  // A plate is an image job. It must never fall through to the video sender.
  if (job.kind === "subtitlePlate") return sendSubtitlePlate(project, clipNumber);
  if (job.kind === "onscreenText") return sendOnscreenText(project, job);
  if (job.kind !== "video") throw new PermanentJobError(`不支援的任務類型：${job.kind}`);
  return sendVideo(project, clipNumber);
}

// Load the user style by id, including a soft-deleted row, and send its preview still.
async function sendStylePreview(job: GenerationJob): Promise<Sent> {
  if (!job.userStyleId) throw new PermanentJobError("找不到 Style");
  const styles = await userStylesCollection();
  const doc = await styles.findOne({ _id: job.userStyleId });
  if (!doc) throw new PermanentJobError("找不到 Style");
  const model = IMAGE_ROUTE_BY_SCENE_TEXT.en.model;
  const submitted = await submitImage({
    model,
    prompt: stylePreviewPrompt(renderableFromUserStyle(doc)),
    aspectRatio: "16:9",
    quality: "medium",
    resolution: "1k",
  });
  return toSent(model, submitted);
}

// Regenerate a lettering sample from the saved lookLine; current image is an appearance ref.
async function sendTextStylePreview(job: GenerationJob): Promise<Sent> {
  if (!job.textStyleId) throw new PermanentJobError("找不到文字樣式");
  const styles = await textStylesCollection();
  const doc = (await styles.findOne({ _id: job.textStyleId })) as TextStyleDoc | null;
  if (!doc) throw new PermanentJobError("找不到文字樣式");
  const model = IMAGE_ROUTE_BY_SCENE_TEXT.en.model;
  const lookLine = resolveTextStyleLookLine(doc);
  const submitted = await submitImage({
    model,
    prompt: textStyleSamplePrompt(lookLine),
    aspectRatio: "16:9",
    quality: "medium",
    resolution: "1k",
    // Seed appearance from the current sample without locking its crop.
    referenceImageUrls: doc.imageUrl ? [doc.imageUrl] : undefined,
  });
  return toSent(model, submitted);
}

// Load the custom director by id and send its 5-frame preview strip.
async function sendDirectorPreview(job: GenerationJob): Promise<Sent> {
  if (!job.skillId) throw new PermanentJobError("找不到 Director");
  const directors = await directorsCollection();
  const doc = await directors.findOne({ _id: job.skillId });
  if (!doc) throw new PermanentJobError("找不到 Director");
  const model = IMAGE_ROUTE_BY_SCENE_TEXT.en.model;
  const submitted = await submitImage({
    model,
    prompt: await directorPreviewImagePrompt(doc),
    aspectRatio: "16:9",
    quality: "medium",
    resolution: "1k",
  });
  return toSent(model, submitted);
}

async function sendCharacter(job: GenerationJob) {
  const characters = await charactersCollection();
  const character = (await characters.findOne({ _id: job.characterId })) as Character | null;
  const version = character?.versions.find((item) => item.id.equals(job.versionId!));
  if (!character || !version) throw new PermanentJobError("角色版本已不存在");
  if (job.characterSlot === "profile") return sendCharacterProfile(character, version);
  if (job.characterSlot === "fullBody") return sendCharacterFullBody(character, version);
  return sendCharacterVersion(character, version);
}

// Phase B runs once: a retry reuses the prompt already written to the clip.
async function sendVideo(project: Project, clipNumber: number) {
  if (!project.phaseA) throw new PermanentJobError("找不到分鏡");
  // Missing keyframes will not fix themselves; stop before spending a Phase B call.
  const startOnly = clipSkipsEndStill(project);
  const merged = usesTalkingHeadSubtitleOverlay({
    skillSlug: project.skillSlug,
    styleId: project.styleId,
  });
  const { start, end } = videoKeyframeUrls(project.frames, clipNumber, {
    merged,
    endFromNextStart: clipEndIsNextStart(project, clipNumber),
  });
  if (!start || (!startOnly && !end)) {
    throw new PermanentJobError(
      merged ? "字幕還沒疊上畫格，無法產片" : "這段的起點或終點畫格還沒有檔案，無法產片",
    );
  }
  const clip = project.clips.find((item) => item.clipNumber === clipNumber);
  if (clip?.prompt && !isTalkingHeadSkill(project.skillSlug)) {
    const story = project.phaseA?.clips.find((item) => item.clipNumber === clipNumber);
    const prompt = !storyboardAsksForSubtitle(story?.startScene, story?.endScene, story?.explainerScene)
      ? dropInventedSubtitleLock(clip.prompt)
      : clip.prompt;
    return sendClipVideo(project, clipNumber, {
      clipNumber,
      prompt,
      durationSeconds: clip.durationSeconds,
    });
  }

  const skill = await loadStoredSkill(project.skillId);
  if (!skill) throw new PermanentJobError("找不到風格");
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const prompt = await runPhaseBForClip({
    skill: await resolveRunSkill(skill).catch((error: unknown) => {
      if (error instanceof MissingTemplateError) throw new PermanentJobError(error.message);
      throw error;
    }),
    style,
    phaseA: project.phaseA,
    clipNumber,
    language: project.language,
    narrationEnabled: project.narrationEnabled,
    voiceGender: project.voiceGender,
    speechPace: project.speechPace,
    characterImageUrl: project.characterImageUrl,
    cast: await withCurrentCharacterVoices(project.cast),
    subtitleHandoff:
      usesTalkingHeadSubtitleOverlay({ skillSlug: project.skillSlug, styleId: project.styleId }) &&
      project.skillSlug === TALKING_HEAD_SKILL_SLUG,
    sceneTextOff: !resolveSceneText(project).enabled,
    directorBackgroundId: project.directorBackgroundId,
    backgroundImageUrls: project.backgroundImageUrls,
  });
  await saveClipPhaseBPrompt(project._id, clipNumber, prompt);
  return sendClipVideo(project, clipNumber, prompt);
}
