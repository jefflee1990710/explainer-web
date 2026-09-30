import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { ObjectId } from "mongodb";

loadEnvConfig(process.cwd());

type Case = {
  id: string;
  skillSlug: string;
  styleId: "doodle" | "flat-vector" | "clay" | "pixel";
  aspectRatio: "16:9" | "9:16" | "1:1";
  source: string;
};

const CASES: Case[] = [
  {
    id: "scro-reel",
    skillSlug: "story-short-director",
    styleId: "doodle",
    aspectRatio: "9:16",
    source:
      "One 6-second vertical Reel, one scene only. A creator at a white desk picks a doodle style, a storyboard of three frames snaps onto the wall, and the frames become a short video. End on the playing video. Do not add a second scene.",
  },
  {
    id: "scro-deck",
    skillSlug: "cartoon-explainer-video-director",
    styleId: "flat-vector",
    aspectRatio: "16:9",
    source:
      "One 6-second widescreen explainer for a presentation, one scene only. Show three ideas in a single shot: pick a style, approve a storyboard, export a video. End on the exported video playing. Do not add a second scene.",
  },
  {
    id: "luma-bottle",
    skillSlug: "product-demo-director",
    styleId: "clay",
    aspectRatio: "1:1",
    source:
      "One 6-second square product demo, one scene only. Fictional product Luma Bottle: a chunky glass water bottle that glows mint when it is time to drink. A person lifts it from a box and the bottle lights up. End on the glow. Do not add a second scene.",
  },
  {
    id: "pixel-post",
    skillSlug: "story-short-director",
    styleId: "pixel",
    aspectRatio: "16:9",
    source:
      "One 6-second widescreen short, one scene only. Fictional product Pixel Post: a tiny mailbox robot that delivers one kind note. The robot pops out and hands over a glowing note. End on the note. Do not add a second scene.",
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const {
    usersCollection,
    subscriptionsCollection,
    projectsCollection,
    skillsCollection,
    videosCollection,
    generationJobsCollection,
  } = await import("@/dao");
  const { runPhaseAJob } = await import("@/service/director/jobs");
  const { submitStillIfNeeded, enqueueClipFrameJobs, refreshProjectJobs } =
    await import("@/service/higgsfield/pipeline");
  const { claimAndStartClipVideo } = await import("@/service/clip/auto-video");
  const { consumeCredits } = await import("@/service/billing/credits");
  const { runJobById } = await import("@/service/generation/task-runner");
  const { FRAMES_COST, clipVideoCost } = await import("@/service/production-plan");
  const { mediaSrc } = await import("@/util/media-src");
  const { isStyleId } = await import("@/service/style");

  const users = await usersCollection();
  const subs = await subscriptionsCollection();
  const active = await subs
    .find({ status: { $in: ["trialing", "active"] } })
    .toArray();
  const activeIds = new Set(active.map((row) => row.clerkUserId));
  const user = await users.findOne({
    clerkUserId: { $in: [...activeIds] },
    credits: { $gte: 12 },
  });
  if (!user) throw new Error("沒有足夠 credits 的訂閱帳號");

  const folders = await projectsCollection();
  const now = new Date();
  const folderInsert = await folders.insertOne({
    userId: user._id,
    clerkUserId: user.clerkUserId,
    name: "Landing showcase",
    createdAt: now,
    updatedAt: now,
  });

  const skills = await skillsCollection();
  const videos = await videosCollection();
  const ids = new Map<string, ObjectId>();

  for (const item of CASES) {
    if (!isStyleId(item.styleId)) throw new Error(item.styleId);
    const skill = await skills.findOne({ slug: item.skillSlug, isActive: true });
    if (!skill) throw new Error(`找不到 ${item.skillSlug}`);
    const inserted = await videos.insertOne({
      projectId: folderInsert.insertedId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      skillId: skill._id,
      skillSlug: skill.slug,
      styleId: item.styleId,
      source: item.source,
      aspectRatio: item.aspectRatio,
      durationPreset: "micro",
      language: "en",
      voiceGender: "female",
      sceneTextEnabled: true,
      sceneTextLanguage: "en",
      cast: [],
      status: "phase_a",
      clips: [],
      creditsCharged: false,
      createdAt: now,
      updatedAt: now,
    });
    ids.set(item.id, inserted.insertedId);
    console.log("created", item.id, inserted.insertedId.toHexString());
  }

  await Promise.all(
    CASES.map(async (item) => {
      const id = ids.get(item.id)!;
      console.log("phase-a", item.id);
      await runPhaseAJob(id);
      const fresh = await videos.findOne({ _id: id });
      if (!fresh?.phaseA?.clips?.length) {
        throw new Error(`${item.id} 分鏡失敗 ${fresh?.error || fresh?.status}`);
      }
      if (fresh.phaseA.clips.length > 1) {
        fresh.phaseA.clips = fresh.phaseA.clips.slice(0, 1);
        await videos.updateOne(
          { _id: id },
          { $set: { phaseA: fresh.phaseA, updatedAt: new Date() } },
        );
      }
      console.log("phase-a-done", item.id, fresh.phaseA.clips[0]?.narrativeJob);
    }),
  );

  const projectIds = [...ids.values()];

  async function pump() {
    const jobs = await generationJobsCollection();
    const due = await jobs
      .find({
        projectId: { $in: projectIds },
        status: "pending",
        nextAttemptAt: { $lte: new Date() },
      })
      .toArray();
    for (const job of due) {
      console.log("run", String(job.projectId), job.kind, job.framePosition || "", job.clipIndex);
      await runJobById(job._id);
    }
    for (const id of projectIds) {
      await refreshProjectJobs(id);
    }
  }

  for (const item of CASES) {
    const project = await videos.findOne({ _id: ids.get(item.id)! });
    if (project) await submitStillIfNeeded(project);
  }

  const stillDeadline = Date.now() + 8 * 60_000;
  while (Date.now() < stillDeadline) {
    await pump();
    const rows = await videos.find({ _id: { $in: projectIds } }).toArray();
    const ready = rows.filter((row) => row.characterStillUrl || row.stillError);
    console.log("stills", ready.length, "/", rows.length);
    if (ready.length === rows.length) break;
    await sleep(8000);
  }

  for (const item of CASES) {
    const project = await videos.findOne({ _id: ids.get(item.id)! });
    if (!project?.characterStillUrl) {
      console.error("still-missing", item.id, project?.stillError || project?.status);
      continue;
    }
    await consumeCredits(user.clerkUserId, FRAMES_COST);
    await enqueueClipFrameJobs(project, [1]);
    console.log("frames-queued", item.id);
  }

  const frameDeadline = Date.now() + 12 * 60_000;
  while (Date.now() < frameDeadline) {
    await pump();
    const rows = await videos.find({ _id: { $in: projectIds } }).toArray();
    const done = rows.filter((row) => {
      const frames = (row.frames || []).filter((frame) => frame.clipNumber === 1);
      return (["start", "end"] as const).every((position) => {
        const frame = frames.find((item) => item.position === position);
        return frame?.status === "completed" && Boolean(mediaSrc(frame));
      });
    });
    const failed = rows.filter((row) =>
      (row.frames || []).some((frame) => frame.clipNumber === 1 && frame.status === "failed"),
    );
    console.log("frames", done.length, "failed", failed.map((row) => row._id.toHexString()));
    if (done.length + failed.length >= CASES.length) break;
    await sleep(8000);
  }

  for (const item of CASES) {
    const project = await videos.findOne({ _id: ids.get(item.id)! });
    if (!project) continue;
    const frames = (project.frames || []).filter((frame) => frame.clipNumber === 1);
    const ready = (["start", "end"] as const).every((position) => {
      const frame = frames.find((row) => row.position === position);
      return frame?.status === "completed" && Boolean(mediaSrc(frame));
    });
    if (!ready) {
      console.error("frames-missing", item.id);
      continue;
    }
    await consumeCredits(user.clerkUserId, clipVideoCost(project, 1));
    const started = await claimAndStartClipVideo(user.clerkUserId, project, 1);
    console.log("video-queued", item.id, started.ok ? "ok" : started.error);
  }

  const videoDeadline = Date.now() + 15 * 60_000;
  const finished = new Map<string, string>();
  while (Date.now() < videoDeadline && finished.size < CASES.length) {
    await pump();
    for (const item of CASES) {
      if (finished.has(item.id)) continue;
      const project = await videos.findOne({ _id: ids.get(item.id)! });
      const clip = project?.clips?.find((row) => row.clipNumber === 1);
      const src = mediaSrc(clip);
      if (clip?.status === "failed") {
        console.error("video-failed", item.id, clip.error);
        finished.set(item.id, "");
        continue;
      }
      if (clip?.status === "completed" && src) {
        finished.set(item.id, src);
        console.log("video-ready", item.id, src);
      }
    }
    if ([...finished.values()].every((src) => src !== undefined) && finished.size === CASES.length) break;
    await sleep(8000);
  }

  const outDir = path.join(process.cwd(), "public/showcase");
  await mkdir(outDir, { recursive: true });
  for (const item of CASES) {
    const src = finished.get(item.id);
    if (!src) {
      console.error("missing-file", item.id);
      continue;
    }
    const response = await fetch(src);
    if (!response.ok) throw new Error(`${item.id} download ${response.status}`);
    const file = path.join(outDir, `${item.id}.mp4`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    console.log("saved", file);
  }
  console.log("showcase-done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
