import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";

loadEnvConfig(process.cwd());

// Ask the end-scene director for clip 2's endUsesStartStill, save it, then redraw the end still.
// The start still stays. The job is claimed here so production cron cannot send old code.
const VIDEO_ID = "6aca25d0aee1e0adb1d53a01";
const CLIP = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { generationJobsCollection, videosCollection } = await import("@/dao");
  const { consumeCredits, refundCredits } = await import("@/service/billing/credits");
  const { FRAME_COST } = await import("@/service/credit-costs");
  const { rewriteEndScenes } = await import("@/service/director/end-scene-rewrite");
  const { withWrittenCanvas } = await import("@/service/director/written-chinese");
  const { runJobById } = await import("@/service/generation/task-runner");
  const { frameSubmitPlan } = await import("@/service/higgsfield/frame-prompts");
  const { refreshProjectJobs, regenerateFrame } = await import("@/service/higgsfield/pipeline");
  const { loadRenderableStyle } = await import("@/service/style/renderable-style");

  const projects = await videosCollection();
  const project = await projects.findOne({ _id: new ObjectId(VIDEO_ID) });
  if (!project?.phaseA) throw new Error("找不到這條影片");
  const clip = project.phaseA.clips.find((item) => item.clipNumber === CLIP);
  if (!clip) throw new Error("找不到 clip 2");
  const end = (project.frames || []).find((frame) => frame.clipNumber === CLIP && frame.position === "end");
  if (end?.status === "queued" || end?.status === "in_progress") {
    throw new Error("clip 2 的結尾圖還在產生中");
  }

  const rewritten = await rewriteEndScenes({
    clips: [clip],
    language: project.language,
    skillSlug: project.skillSlug,
  });
  const nextClip = rewritten[0];
  if (!nextClip || typeof nextClip.endUsesStartStill !== "boolean") {
    throw new Error("導演沒有交 endUsesStartStill，停止送出");
  }
  console.log(
    JSON.stringify({
      before: clip.endUsesStartStill ?? null,
      endUsesStartStill: nextClip.endUsesStartStill,
      endScene: nextClip.endScene,
    }),
  );

  await projects.updateOne(
    { _id: project._id },
    { $set: { "phaseA.clips.$[clip]": nextClip, updatedAt: new Date() } },
    { arrayFilters: [{ "clip.clipNumber": CLIP }] },
  );

  const saved = await projects.findOne({ _id: project._id });
  if (!saved) throw new Error("存檔後找不到影片");
  const style = await loadRenderableStyle({
    styleId: saved.styleId,
    ownerClerkUserId: saved.clerkUserId,
  });
  const plan = frameSubmitPlan(await withWrittenCanvas(saved), CLIP, "end", undefined, style);
  const attachedStart = plan.refs.some((url) => url.includes("/frames/"));
  if (attachedStart !== nextClip.endUsesStartStill) {
    throw new Error(
      `生圖計畫和導演不一致：endUsesStartStill=${nextClip.endUsesStartStill} attachedStart=${attachedStart}`,
    );
  }
  console.log(
    JSON.stringify({
      refs: plan.refs,
      landed: plan.prompt.split("\n").find((line) => line.startsWith("LANDED CAMERA")) ?? null,
      lock: plan.prompt.includes("COMPOSITION LOCK"),
    }),
  );

  const spendKey = await consumeCredits(saved.clerkUserId, FRAME_COST);
  try {
    await regenerateFrame(saved, CLIP, "end");
  } catch (error) {
    await refundCredits(saved.clerkUserId, FRAME_COST, spendKey);
    throw error;
  }

  const jobs = await generationJobsCollection();
  const queued = await jobs.findOne({
    projectId: saved._id,
    kind: "frame",
    clipIndex: CLIP - 1,
    framePosition: "end",
  });
  if (!queued) throw new Error("沒有結尾圖工作");
  if (queued.status === "pending" && !queued.awaits) await runJobById(queued._id);

  const deadline = Date.now() + 6 * 60 * 1000;
  while (Date.now() < deadline) {
    await refreshProjectJobs(saved._id);
    const fresh = await projects.findOne({ _id: saved._id });
    const frame = fresh?.frames?.find((item) => item.clipNumber === CLIP && item.position === "end");
    console.log(
      JSON.stringify({
        t: new Date().toISOString(),
        status: frame?.status,
        url: frame?.blobUrl ?? null,
        error: frame?.error ?? null,
      }),
    );
    if (frame?.status === "failed") break;
    if (frame?.status === "completed" && frame.blobUrl) break;
    const pending = await jobs.findOne({ _id: queued._id });
    if (pending?.status === "pending" && !pending.awaits) await runJobById(pending._id);
    await sleep(5000);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
