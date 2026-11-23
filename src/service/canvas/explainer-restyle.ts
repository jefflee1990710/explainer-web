// Canvas Explainer text style change: rebuild every start-still prompt from the backing video.
// Free; only the lettering Look line changes, so the plan itself is kept.

import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { buildCanvasPlanFramePrompts } from "@/service/canvas/explainer-plan-phase-b";
import { isSubtitleLook } from "@/service/director/subtitle-look";

export type RestyleCanvasExplainerResult =
  | { ok: true; framePrompts: { clipNumber: number; prompt: string }[] }
  | { ok: false; error: string };

export async function restyleCanvasExplainer(params: {
  clerkUserId: string;
  plannerVideoId: string;
  textStyleId: string;
}): Promise<RestyleCanvasExplainerResult> {
  if (!ObjectId.isValid(params.plannerVideoId)) return { ok: false, error: "找不到這組解說的規劃" };
  if (!isSubtitleLook(params.textStyleId)) return { ok: false, error: "不支援這個文字樣式" };
  const look = params.textStyleId;
  const videos = await videosCollection();
  const filter = { _id: new ObjectId(params.plannerVideoId), clerkUserId: params.clerkUserId };
  const video = await videos.findOne({ ...filter, canvasPlanOnly: true });
  if (!video?.phaseA) return { ok: false, error: "找不到這組解說的規劃" };

  const lookFields = { subtitleLook: look, textStyleId: look, onScreenTextStyleId: look };
  const framePrompts = await buildCanvasPlanFramePrompts({ ...video, ...lookFields });
  await videos.updateOne(filter, {
    $set: { ...lookFields, "canvasPlan.framePrompts": framePrompts, updatedAt: new Date() },
  });
  return { ok: true, framePrompts };
}
