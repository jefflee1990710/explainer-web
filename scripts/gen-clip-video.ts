/**
 * Phase B + submit clip video, then poll until a URL lands.
 * Usage: npx tsx scripts/gen-clip-video.ts <videoId> [clipNumber=1]
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { ALICLOUD_VIDEO_MODEL } from "@/service/alicloud/dashscope";
import { generationJobsCollection, videosCollection } from "@/dao";
import { loadStoredSkill } from "@/service/director/load-skill";
import { insertPendingJob } from "@/service/generation/task-store";
import { runJobById } from "@/service/generation/task-runner";
import { withCurrentCharacterVoices } from "@/service/character/voice-cast";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { clipKeyframeUrls } from "@/service/higgsfield/clip-keyframes";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { mediaSrc } from "@/util/media-src";
import { refreshProjectJobs } from "@/service/higgsfield/pipeline";
import { hydrateStyles } from "@/service/style/load-style";
import type { Project } from "@/model/project";

loadEnvConfig(process.cwd());

// Queue the clip's video and send it now; the sender reuses the prompt written above.
async function sendClipVideoNow(projectId: ObjectId, clipNumber: number) {
  const jobs = await generationJobsCollection();
  await jobs.deleteMany({ projectId, kind: "video", clipIndex: clipNumber - 1 });
  const id = await insertPendingJob({ projectId, clipIndex: clipNumber - 1, kind: "video" });
  await runJobById(id);
}

const POLL_MS = 10_000;
const TIMEOUT_MS = 15 * 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await hydrateStyles();
  const videoId = process.argv[2] || "6aae09120d76b8b8baa76aaa";
  const clipNumber = Number(process.argv[3] || "1");
  const projectId = new ObjectId(videoId);
  const videos = await videosCollection();
  const project = (await videos.findOne({ _id: projectId })) as Project | null;
  if (!project?.phaseA) throw new Error("專案缺少分鏡");

  const row = project.phaseA.clips.find((clip) => clip.clipNumber === clipNumber);
  if (!row) throw new Error(`找不到 clip ${clipNumber}`);
  const keys = clipKeyframeUrls(project.frames, clipNumber);
  if (!keys.start || !keys.end) throw new Error("這段的起點或終點畫格還沒有檔案");

  const skill = await loadStoredSkill(project.skillId);
  if (!skill) throw new Error("找不到風格");

  const submittedAt = new Date().toISOString();
  const existing = (project.clips || []).find((clip) => clip.clipNumber === clipNumber);
  if (existing) {
    await videos.updateOne(
      { _id: projectId, "clips.clipNumber": clipNumber },
      {
        $set: {
          "clips.$.status": "queued",
          "clips.$.submittedAt": submittedAt,
          status: "production",
          updatedAt: new Date(),
        },
        $unset: { "clips.$.error": "", "clips.$.blobUrl": "", "clips.$.outputUrl": "" },
      },
    );
  } else {
    await videos.updateOne(
      { _id: projectId },
      {
        $push: {
          clips: {
            clipNumber,
            durationSeconds: row.durationSeconds,
            prompt: "",
            status: "queued" as const,
            submittedAt,
          },
        },
        $set: { status: "production", updatedAt: new Date() },
      },
    );
  }

  const reusePrompt = process.argv.includes("--reuse-prompt");
  const prompt = reusePrompt && existing?.prompt
    ? {
        clipNumber,
        durationSeconds: existing.durationSeconds || row.durationSeconds,
        prompt: existing.prompt,
      }
    : await runPhaseBForClip({
        skill,
        style: await loadRenderableStyle({
          styleId: project.styleId,
          ownerClerkUserId: project.clerkUserId,
        }),
        phaseA: project.phaseA,
        clipNumber,
        language: project.language,
        voiceGender: project.voiceGender,
        speechPace: project.speechPace,
        characterImageUrl: project.characterImageUrl,
        cast: await withCurrentCharacterVoices(project.cast),
      });
  await videos.updateOne(
    { _id: projectId, "clips.clipNumber": clipNumber },
    {
      $set: {
        "clips.$.prompt": prompt.prompt,
        "clips.$.durationSeconds": prompt.durationSeconds,
        updatedAt: new Date(),
      },
    },
  );

  const submitStarted = Date.now();
  await sendClipVideoNow(projectId, clipNumber);

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await refreshProjectJobs(projectId);
    const next = (await videos.findOne({ _id: projectId })) as Project;
    const clip = (next.clips || []).find((item) => item.clipNumber === clipNumber);
    if (clip?.status === "failed") {
      throw new Error(clip.error || "影片產生失敗");
    }
    if (clip?.status === "completed" && mediaSrc(clip)) {
      console.log(
        JSON.stringify(
          {
            projectId: videoId,
            title: next.phaseA?.localizedTitle,
            clipNumber,
            durationSeconds: prompt.durationSeconds,
            englishVo: row.englishVo,
            startFrameUrl: keys.start,
            endFrameUrl: keys.end,
            videoUrl: mediaSrc(clip),
            videoModel: ALICLOUD_VIDEO_MODEL,
            reusedPrompt: reusePrompt && Boolean(existing?.prompt),
            submitMs: Date.now() - submitStarted,
            phaseBPromptPreview: prompt.prompt.slice(0, 280),
            mouthLocked: /Mouth:/.test(prompt.prompt),
            voiceLocked: /voice lock verbatim|Unlocked \(/.test(prompt.prompt),
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }
    await sleep(POLL_MS);
  }
  throw new Error("影片產生逾時");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
