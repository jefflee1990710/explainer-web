import { writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { ObjectId } from "mongodb";
import { generationJobsCollection, usersCollection, videosCollection } from "@/dao";
import { voiceSwapVoiceId } from "@/model/character-voice-sample";
import { consumeCreditUsd, refundCreditUsd } from "@/service/billing/credits";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { FRAME_COST_USD, videoCostUsd } from "@/service/credit-costs";
import { addUsd, mulUsd } from "@/service/billing/usd";
import { frameSubmitPlan } from "@/service/higgsfield/frame-prompts";
import { regenerateFrames } from "@/service/higgsfield/pipeline";
import { hydrateStyles } from "@/service/style/load-style";
import { loadRenderableStyle } from "@/service/style/renderable-style";

const VIDEO_ID = "6ac8f30a969a0d0a6433ec1c";

async function main() {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: new ObjectId(VIDEO_ID) });
  if (!project?.phaseA) throw new Error("找不到這條影片");

  const clips = project.phaseA.clips;
  const targets = clips.flatMap((clip) =>
    (["start", "end"] as const).map((position) => ({
      clipNumber: clip.clipNumber,
      position,
    })),
  );
  // Drop finished files in memory so each end waits for the new start,
  // and each later start waits for the previous new end.
  const planned = {
    ...project,
    frames: (project.frames || []).map((frame) => ({
      ...frame,
      blobUrl: undefined,
      outputUrl: undefined,
    })),
  };

  await hydrateStyles();
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const prompts = targets.map((target) => {
    const clip = clips.find((item) => item.clipNumber === target.clipNumber);
    const plan = frameSubmitPlan(planned, target.clipNumber, target.position, undefined, style);
    const line = clip?.englishVo?.split(/[，,]/)[target.position === "start" ? 0 : 1]?.trim() ?? "";
    return {
      clip: target.clipNumber,
      position: target.position,
      chars: plan.prompt.length,
      keepsLine: line ? plan.prompt.includes(line) : false,
      line,
    };
  });
  const sample = frameSubmitPlan(planned, 1, "start", undefined, style);
  await writeFile("/tmp/ideogram-prompt.txt", sample.prompt);
  console.log(JSON.stringify(prompts, null, 2));
  if (prompts.some((item) => item.chars > 5000 || !item.keepsLine)) {
    throw new Error("提示過長，或遺失了要原樣畫出的句子");
  }
  if (process.env.CHECK_ONLY === "1") return;

  // Sunburst stills were the wrong model. Clip 1's Ideogram pair already refunded
  // itself when it failed; the other six frame charges still cover this redraw.
  const sunburstRefundUsd = 1.28;
  await refundCreditUsd(project.clerkUserId, sunburstRefundUsd);
  const frameCostUsd = mulUsd(FRAME_COST_USD, 2);
  const voiceSwap = Boolean(voiceSwapVoiceId(project.cast));
  const videoTotalUsd = clips.reduce(
    (sum, clip) => addUsd(sum, videoCostUsd(clip.durationSeconds, project.styleId, voiceSwap)),
    0,
  );
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId: project.clerkUserId });
  const bal = user ? resolveUserUsdBalance(user) : null;
  const balanceUsd = bal ? addUsd(bal.creditUsd, bal.bonusCreditUsd) : 0;
  console.log(
    JSON.stringify({
      sceneTextLanguage: project.sceneTextLanguage,
      clips: clips.map((clip) => clip.durationSeconds),
      frameCostUsd,
      videoTotalUsd,
      sunburstRefundUsd,
      balanceUsd,
    }),
  );
  if (balanceUsd < frameCostUsd) throw new Error("USD Credit 不足，無法扣款");

  await consumeCreditUsd(project.clerkUserId, frameCostUsd);
  const result = await regenerateFrames(planned, targets);
  // Videos start themselves once each clip's two new stills exist.
  if (balanceUsd >= addUsd(frameCostUsd, videoTotalUsd)) {
    await projects.updateOne(
      { _id: project._id },
      { $addToSet: { autoVideoClips: { $each: clips.map((clip) => clip.clipNumber) } } },
    );
  }

  const jobs = await generationJobsCollection();
  const rows = await jobs.find({ projectId: project._id, kind: "frame" }).sort({ clipIndex: 1 }).toArray();
  console.log(
    JSON.stringify({
      deferred: result.deferred.map((item) => `${item.clipNumber}:${item.position}`),
      autoVideo: balanceUsd >= addUsd(frameCostUsd, videoTotalUsd),
      jobs: rows.map((job) => ({
        clip: (job.clipIndex ?? 0) + 1,
        position: job.framePosition,
        status: job.status,
        awaits: job.awaits ?? null,
      })),
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
