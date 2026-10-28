import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";

loadEnvConfig(process.cwd());

const VIDEO_ID = "6ac78edcc542118f53c3b142";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { videosCollection, generationJobsCollection } = await import("../src/dao");
  const { planTalkingHeadClips } = await import("../src/service/director/talking-head");
  const { regenerateFrame } = await import("../src/service/higgsfield/pipeline");
  const { runJobById } = await import("../src/service/generation/task-runner");
  const { claimAndStartClipVideo } = await import("../src/service/clip/auto-video");
  const { clipVideoCost } = await import("../src/service/production-plan");
  const { FRAME_COST } = await import("../src/service/credit-costs");
  const { consumeCredits } = await import("../src/service/billing/credits");
  const { isRealisticStyle } = await import("../src/service/style/realistic-light");
  const { loadRenderableStyle } = await import("../src/service/style/renderable-style");

  const videos = await videosCollection();
  const project = await videos.findOne({ _id: new ObjectId(VIDEO_ID) });
  if (!project?.phaseA?.clips?.[0]) throw new Error("video/phaseA missing");

  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const script = project.phaseA.clips.map((clip) => clip.englishVo).join(" ");
  const planned = planTalkingHeadClips({
    source: script,
    language: project.language,
    aspectRatio: project.aspectRatio,
    talkingHeadBackgroundId: project.talkingHeadBackgroundId,
    talkingHeadPoseId: project.talkingHeadPoseId,
    realistic: isRealisticStyle(style),
  });
  if (!planned[0]) throw new Error("no planned clip");

  console.log("NEW_START", planned[0].startScene.slice(0, 400));
  console.log("NEW_END", planned[0].endScene.slice(0, 280));

  await videos.updateOne(
    { _id: project._id },
    {
      $set: {
        "phaseA.clips.0.startScene": planned[0].startScene,
        "phaseA.clips.0.endScene": planned[0].endScene,
        "phaseA.clips.0.motionCamera": planned[0].motionCamera,
        "phaseA.clips.0.explainerScene": planned[0].explainerScene ?? planned[0].startScene,
        objectSheetItems: [],
        backgroundPlates: [],
        updatedAt: new Date(),
      },
      $unset: {
        objectSheetUrl: "",
      },
    },
  );

  const refreshed = await videos.findOne({ _id: project._id });
  if (!refreshed) throw new Error("refresh failed");

  console.log("charging frame", FRAME_COST);
  await consumeCredits(refreshed.clerkUserId, FRAME_COST);
  await regenerateFrame(refreshed, 1, "start");

  const jobs = await generationJobsCollection();
  let startUrl = "";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const pending = await jobs.findOne(
      { projectId: project._id, kind: "frame", clipIndex: 0, framePosition: "start" },
      { sort: { createdAt: -1 } },
    );
    console.log(
      "frame-job",
      pending?._id.toHexString(),
      pending?.status,
      pending?.error ?? null,
    );
    if (pending?.status === "pending" && !pending.awaits) {
      await runJobById(pending._id);
    }
    if (pending?.status === "submitting") {
      await jobs.updateOne(
        { _id: pending._id },
        { $set: { status: "pending", attempts: 0 }, $unset: { lockedUntil: "", awaits: "" } },
      );
    }
    if (pending?.status === "completed" && pending.blobUrl) {
      startUrl = String(pending.blobUrl);
      break;
    }
    if (pending?.status === "failed" || pending?.status === "nsfw") {
      throw new Error(`frame failed: ${pending.error ?? pending.status}`);
    }
    await sleep(8000);
  }
  if (!startUrl) throw new Error("frame timed out");
  console.log("START_URL", startUrl);

  const afterFrame = await videos.findOne({ _id: project._id });
  if (!afterFrame) throw new Error("missing after frame");
  const cost = clipVideoCost(afterFrame, 1);
  console.log("charging video", cost);
  await consumeCredits(afterFrame.clerkUserId, cost);
  const started = await claimAndStartClipVideo(afterFrame.clerkUserId, afterFrame, 1);
  console.log("video-started", started);
  if (!started.ok) throw new Error(started.error);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const pending = await jobs.findOne(
      { projectId: project._id, kind: "video", clipIndex: 0 },
      { sort: { createdAt: -1 } },
    );
    console.log("video-job", pending?._id.toHexString(), pending?.status, pending?.requestId ?? null);
    if (pending?.status === "pending" && !pending.awaits) {
      await runJobById(pending._id);
    }
    if (pending?.status === "completed" && pending.blobUrl) {
      console.log(
        JSON.stringify(
          {
            jobId: pending._id.toHexString(),
            requestId: pending.requestId,
            blobUrl: pending.blobUrl,
            startUrl,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }
    if (pending?.status === "failed" || pending?.status === "nsfw") {
      throw new Error(`video failed: ${pending.error ?? pending.status}`);
    }
    await sleep(15000);
  }
  throw new Error("video timed out");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
