/**
 * Clone a source video per voiceover language, run Phase A from source,
 * then generate every start/end still and Wan 3.0 clip.
 * Usage: npx tsx scripts/gen-vo-language-variants.ts [sourceVideoId]
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { ALICLOUD_VIDEO_MODEL } from "@/service/alicloud/dashscope";
import { skillsCollection, videosCollection } from "@/dao";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { runPhaseAJob } from "@/service/director/jobs";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { imageRouteForSceneText } from "@/service/generation/image-backend";
import { clipKeyframeUrls } from "@/service/higgsfield/clip-keyframes";
import { framesWithClip, videoStyle } from "@/service/higgsfield/frame-prompts";
import { mediaSrc } from "@/util/media-src";
import { refreshProjectJobs, regenerateFrames, submitClipVideoJob } from "@/service/higgsfield/pipeline";
import type { FramePosition, Project, SceneTextLanguage, VoLanguage } from "@/model/project";

loadEnvConfig(process.cwd());

const POLL_MS = 8_000;
const PHASE_A_TIMEOUT_MS = 8 * 60_000;
const FRAME_TIMEOUT_MS = 12 * 60_000;
const VIDEO_TIMEOUT_MS = 15 * 60_000;

type Variant = {
  language: VoLanguage;
  sceneTextLanguage: SceneTextLanguage;
};

const VARIANTS: Variant[] = [
  { language: "en", sceneTextLanguage: "en" },
  { language: "yue", sceneTextLanguage: "zh-Hant" },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function directorRevision(language: VoLanguage) {
  const preset = LANGUAGE_PRESETS[language];
  return [
    "Ignore any previous draft. Write a complete new Phase A from the source.",
    `Voiceover language is ${preset.label} (${preset.sublabel}). Every englishVo line MUST be in that spoken language.`,
    "Every clip's explainerScene MUST write 起始 and 結尾（N秒後） as two distinct states.",
    "Scale start→end travel by that clip's durationSeconds (3s small beat, 4s beat+follow-through, 5–6s two beats, 7–8s two stronger beats).",
    "Same locked camera; no cut or teleport. motionCamera must name how far things move.",
    "On-canvas text (when enabled) is only that clip's englishVo as a bottom subtitle.",
  ].join(" ");
}

async function waitPhaseA(projectId: ObjectId, startedAt: Date) {
  const videos = await videosCollection();
  const deadline = Date.now() + PHASE_A_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const fresh = (await videos.findOne({ _id: projectId })) as Project | null;
    if (
      (fresh?.status === "production" || fresh?.status === "awaiting_approval") &&
      fresh.phaseA &&
      fresh.updatedAt &&
      new Date(fresh.updatedAt) >= startedAt
    ) {
      return fresh;
    }
    if (fresh?.status === "failed") throw new Error(fresh.error || "Phase A 失敗");
    await sleep(POLL_MS);
  }
  throw new Error("Phase A 逾時");
}

async function waitClipFrames(projectId: ObjectId, clipNumber: number) {
  const videos = await videosCollection();
  const deadline = Date.now() + FRAME_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await refreshProjectJobs(projectId);
    const fresh = (await videos.findOne({ _id: projectId })) as Project;
    const rows = (fresh.frames || []).filter((frame) => frame.clipNumber === clipNumber);
    const failed = rows.find((frame) => frame.status === "failed");
    if (failed) throw new Error(`clip ${clipNumber} ${failed.position}: ${failed.error || "失敗"}`);
    const done = (["start", "end"] as FramePosition[]).every((position) => {
      const row = rows.find((frame) => frame.position === position);
      return row?.status === "completed" && Boolean(mediaSrc(row));
    });
    if (done) return fresh;
    await sleep(POLL_MS);
  }
  throw new Error(`clip ${clipNumber} 畫格逾時`);
}

async function waitClipVideo(projectId: ObjectId, clipNumber: number) {
  const videos = await videosCollection();
  const deadline = Date.now() + VIDEO_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await refreshProjectJobs(projectId);
    const next = (await videos.findOne({ _id: projectId })) as Project;
    const clip = (next.clips || []).find((item) => item.clipNumber === clipNumber);
    if (clip?.status === "failed") {
      throw new Error(clip.error || `clip ${clipNumber} 影片失敗`);
    }
    if (clip?.status === "completed" && mediaSrc(clip)) return mediaSrc(clip);
    await sleep(POLL_MS);
  }
  throw new Error(`clip ${clipNumber} 影片逾時`);
}

async function cloneForVariant(source: Project, variant: Variant) {
  const videos = await videosCollection();
  const now = new Date();
  const insert = await videos.insertOne({
    projectId: source.projectId,
    userId: source.userId,
    clerkUserId: source.clerkUserId,
    skillId: source.skillId,
    skillSlug: source.skillSlug,
    styleId: source.styleId,
    source: source.source,
    aspectRatio: source.aspectRatio,
    durationPreset: source.durationPreset,
    language: variant.language,
    sceneTextEnabled: true,
    sceneTextLanguage: variant.sceneTextLanguage,
    characterImageUrl: source.characterImageUrl,
    cast: source.cast,
    status: "phase_a",
    clips: [],
    creditsCharged: false,
    createdAt: now,
    updatedAt: now,
  });
  return insert.insertedId;
}

async function generateFrames(project: Project) {
  const videos = await videosCollection();
  const clips = project.phaseA?.clips || [];
  let current = project;
  const outputs: Array<Record<string, unknown>> = [];

  for (const clip of clips) {
    const frames = framesWithClip(current, clip.clipNumber);
    await videos.updateOne(
      { _id: current._id },
      { $set: { frames, status: "production", updatedAt: new Date() } },
    );
    await regenerateFrames({ ...current, frames }, [
      { clipNumber: clip.clipNumber, position: "start" },
      { clipNumber: clip.clipNumber, position: "end" },
    ]);
    current = await waitClipFrames(current._id, clip.clipNumber);
    const rows = (current.frames || []).filter((frame) => frame.clipNumber === clip.clipNumber);
    outputs.push({
      clipNumber: clip.clipNumber,
      durationSeconds: clip.durationSeconds,
      englishVo: clip.englishVo,
      explainerScene: clip.explainerScene,
      startFrameUrl: mediaSrc(rows.find((frame) => frame.position === "start")),
      endFrameUrl: mediaSrc(rows.find((frame) => frame.position === "end")),
    });
  }
  return { project: current, clips: outputs };
}

async function generateVideos(project: Project) {
  const videos = await videosCollection();
  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill) throw new Error("找不到風格");

  const outputs: Array<Record<string, unknown>> = [];
  for (const row of project.phaseA?.clips || []) {
    const keys = clipKeyframeUrls(project.frames, row.clipNumber);
    if (!keys.start || !keys.end) throw new Error(`clip ${row.clipNumber} 缺畫格`);

    const submittedAt = new Date().toISOString();
    await videos.updateOne(
      { _id: project._id },
      {
        $push: {
          clips: {
            clipNumber: row.clipNumber,
            durationSeconds: row.durationSeconds,
            prompt: "",
            status: "queued" as const,
            submittedAt,
          },
        },
        $set: { status: "production", updatedAt: new Date() },
      },
    );

    const prompt = await runPhaseBForClip({
      skill,
      style: videoStyle(project),
      phaseA: project.phaseA!,
      clipNumber: row.clipNumber,
      language: project.language,
      characterImageUrl: project.characterImageUrl,
      cast: project.cast,
    });
    await videos.updateOne(
      { _id: project._id, "clips.clipNumber": row.clipNumber },
      {
        $set: {
          "clips.$.prompt": prompt.prompt,
          "clips.$.durationSeconds": prompt.durationSeconds,
          updatedAt: new Date(),
        },
      },
    );
    const fresh = (await videos.findOne({ _id: project._id })) as Project;
    await submitClipVideoJob(fresh, row.clipNumber, prompt);
    const videoUrl = await waitClipVideo(project._id, row.clipNumber);
    outputs.push({
      clipNumber: row.clipNumber,
      durationSeconds: prompt.durationSeconds,
      englishVo: row.englishVo,
      startFrameUrl: keys.start,
      endFrameUrl: keys.end,
      videoUrl,
      videoModel: ALICLOUD_VIDEO_MODEL,
    });
  }
  return outputs;
}

async function runVariant(source: Project, variant: Variant) {
  const preset = LANGUAGE_PRESETS[variant.language];
  const imageRoute = imageRouteForSceneText(variant.sceneTextLanguage);
  const projectId = await cloneForVariant(source, variant);
  const phaseAStartedAt = new Date();
  await runPhaseAJob(projectId, directorRevision(variant.language));
  const afterDirector = await waitPhaseA(projectId, phaseAStartedAt);
  const framed = await generateFrames(afterDirector);
  const videos = await generateVideos(framed.project);

  return {
    projectId: projectId.toHexString(),
    label: `${preset.label}（${preset.sublabel}）`,
    language: variant.language,
    sceneTextLanguage: variant.sceneTextLanguage,
    title: framed.project.phaseA?.localizedTitle,
    englishTitle: framed.project.phaseA?.englishTitle,
    narrator: framed.project.phaseA?.narrator,
    imageModel: imageRoute.model,
    videoModel: ALICLOUD_VIDEO_MODEL,
    clips: framed.clips.map((clip) => {
      const video = videos.find((item) => item.clipNumber === clip.clipNumber);
      return { ...clip, videoUrl: video?.videoUrl, videoModel: ALICLOUD_VIDEO_MODEL };
    }),
  };
}

async function main() {
  const sourceId = process.argv[2] || "6aae09120d76b8b8baa76aaa";
  if (!ObjectId.isValid(sourceId)) throw new Error("無效 videoId");

  const videos = await videosCollection();
  const source = (await videos.findOne({ _id: new ObjectId(sourceId) })) as Project | null;
  if (!source?.source) throw new Error("來源專案不存在或沒有 source");

  const results = [];
  for (const variant of VARIANTS) {
    results.push(await runVariant(source, variant));
  }
  console.log(JSON.stringify({ sourceId, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
