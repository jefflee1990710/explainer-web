// Canvas Explainer Frame node: draws one start still through the backing video's frame pipeline.

import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import type { CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { regenerateFrame, stillBlocker } from "@/service/higgsfield/pipeline";

export type ExplainerFrameDeps = {
  findVideo: (videoId: ObjectId, clerkUserId: string) => Promise<Project | null>;
  stillBlocker: (project: Project) => Promise<string | null>;
  storeStartPrompt: (
    videoId: ObjectId,
    clipNumber: number,
    prompt: string,
    hasFrame: boolean,
  ) => Promise<void>;
  regenerateStart: (project: Project, clipNumber: number) => Promise<void>;
};

const defaultDeps: ExplainerFrameDeps = {
  findVideo: async (videoId, clerkUserId) =>
    (await videosCollection()).findOne({ _id: videoId, clerkUserId }),
  stillBlocker,
  storeStartPrompt: async (videoId, clipNumber, prompt, hasFrame) => {
    const videos = await videosCollection();
    if (hasFrame) {
      await videos.updateOne(
        { _id: videoId },
        {
          $set: {
            "frames.$[f].prompt": prompt,
            "frames.$[f].promptEdited": true,
            updatedAt: new Date(),
          },
        },
        { arrayFilters: [{ "f.clipNumber": clipNumber, "f.position": "start" }] },
      );
      return;
    }
    // Idle placeholder so regenerateFrame submits this stored prompt instead of rebuilding one.
    await videos.updateOne(
      { _id: videoId },
      {
        $push: {
          frames: { clipNumber, position: "start", prompt, status: "failed", promptEdited: true },
        },
        $set: { updatedAt: new Date() },
      },
    );
  },
  regenerateStart: (project, clipNumber) =>
    regenerateFrame(project, clipNumber, "start", undefined, { useStoredPrompt: true }),
};

export function explainerFrameJobId(videoId: string, clipNumber: number) {
  return `${videoId}:${clipNumber}`;
}

function parseJobId(externalJobId: string) {
  const [videoHex, clipRaw] = externalJobId.split(":");
  const clipNumber = Number(clipRaw);
  if (!videoHex || !ObjectId.isValid(videoHex) || !Number.isInteger(clipNumber)) return null;
  return { videoId: new ObjectId(videoHex), clipNumber };
}

export async function submitExplainerFrame(
  params: { clerkUserId: string; node: CanvasNode; prompt: string },
  deps?: Partial<ExplainerFrameDeps>,
): Promise<{ domainKind: "explainer_frame"; externalJobId: string }> {
  const resolved = { ...defaultDeps, ...deps };
  const videoHex = params.node.data.toolParams?.plannerVideoId;
  const clipNumber = params.node.data.toolParams?.clipNumber;
  if (typeof videoHex !== "string" || !ObjectId.isValid(videoHex) || typeof clipNumber !== "number") {
    throw new Error("這個分鏡靜幀缺少規劃資料，請重新規劃分鏡");
  }
  const videoId = new ObjectId(videoHex);
  const project = await resolved.findVideo(videoId, params.clerkUserId);
  if (!project?.phaseA) throw new Error("找不到這個解說的分鏡，請重新規劃");
  if (!project.phaseA.clips.some((clip) => clip.clipNumber === clipNumber)) {
    throw new Error("找不到這段分鏡，請重新規劃");
  }
  const blocker = await resolved.stillBlocker(project);
  if (blocker) throw new Error(blocker);
  const hasFrame = (project.frames || []).some(
    (frame) => frame.clipNumber === clipNumber && frame.position === "start",
  );
  await resolved.storeStartPrompt(videoId, clipNumber, params.prompt, hasFrame);
  const fresh = await resolved.findVideo(videoId, params.clerkUserId);
  if (!fresh) throw new Error("找不到這個解說的分鏡，請重新規劃");
  await resolved.regenerateStart(fresh, clipNumber);
  return {
    domainKind: "explainer_frame",
    externalJobId: explainerFrameJobId(videoHex, clipNumber),
  };
}

export async function pollExplainerFrame(
  params: { clerkUserId: string; externalJobId: string },
  deps?: {
    findVideo?: (videoId: ObjectId, clerkUserId: string) => Promise<Pick<Project, "frames"> | null>;
  },
): Promise<
  | { status: "running" }
  | { status: "completed"; outputUrl: string }
  | { status: "failed"; error: string }
> {
  const findVideo = deps?.findVideo ?? defaultDeps.findVideo;
  const parsed = parseJobId(params.externalJobId);
  if (!parsed) return { status: "failed", error: "無效的分鏡靜幀任務" };
  const project = await findVideo(parsed.videoId, params.clerkUserId);
  if (!project) return { status: "failed", error: "找不到這個解說的分鏡" };
  const frame = (project.frames || []).find(
    (f) => f.clipNumber === parsed.clipNumber && f.position === "start",
  );
  if (!frame) return { status: "running" };
  const url = frame.blobUrl || frame.outputUrl;
  if (frame.status === "completed" && url) return { status: "completed", outputUrl: url };
  if (frame.status === "failed") return { status: "failed", error: frame.error || "分鏡靜幀生成失敗" };
  return { status: "running" };
}
