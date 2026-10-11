import { charactersCollection, textStylesCollection, userDirectorsCollection, videosCollection } from "@/dao";
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
import { clipKeyframeUrls } from "@/service/higgsfield/clip-keyframes";
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
import { sendClipVideo, sendFrame, sendStill } from "@/service/higgsfield/pipeline";
import {
  sendBackgroundPlate,
  sendObjectSheet,
} from "@/service/higgsfield/video-locks-pipeline";
import { sendPostPreview } from "@/service/post/send-preview";
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
  const directors = await userDirectorsCollection();
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
  const { start, end } = clipKeyframeUrls(project.frames, clipNumber);
  if (!start || !end) {
    throw new PermanentJobError("這段的起點或終點畫格還沒有檔案，無法產片");
  }
  const clip = project.clips.find((item) => item.clipNumber === clipNumber);
  if (clip?.prompt) {
    return sendClipVideo(project, clipNumber, {
      clipNumber,
      prompt: clip.prompt,
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
    voiceGender: project.voiceGender,
    speechPace: project.speechPace,
    characterImageUrl: project.characterImageUrl,
    cast: await withCurrentCharacterVoices(project.cast),
  });
  const projects = await videosCollection();
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        "clips.$[clip].prompt": prompt.prompt,
        "clips.$[clip].durationSeconds": prompt.durationSeconds,
        updatedAt: new Date(),
      },
    },
    { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
  );
  return sendClipVideo(project, clipNumber, prompt);
}
