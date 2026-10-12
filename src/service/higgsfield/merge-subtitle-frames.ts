import type { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import type { FramePosition } from "@/model/project";
import { plateLineStale } from "@/service/video-edit/subtitle-export";
import { compositeSubtitleStill } from "@/service/video-edit/merge-subtitle-still";
import { persistBuffer } from "@/service/higgsfield/persist";
import { mediaSrc } from "@/util/media-src";

// Overlay the clip's subtitle plate onto each finished still. The clean file
// stays on blobUrl so the next still can lock to pixels without the words.
export async function mergeReadySubtitleFrames(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.subtitleOverlay) return;

  for (const plate of project.subtitlePlates || []) {
    if (plate.status !== "completed" || !plate.blobUrl) continue;
    const spoken = project.phaseA?.clips.find((item) => item.clipNumber === plate.clipNumber);
    if (plateLineStale(plate, spoken?.englishVo)) continue;
    for (const position of ["start", "end"] as const) {
      const frame = project.frames?.find(
        (item) => item.clipNumber === plate.clipNumber && item.position === position,
      );
      const sceneUrl = mediaSrc(frame);
      if (!frame || frame.status !== "completed" || !sceneUrl) continue;
      if (
        frame.mergedUrl &&
        frame.mergedSceneUrl === sceneUrl &&
        frame.mergedPlateUrl === plate.blobUrl
      ) {
        continue;
      }
      await mergeOne(projectId, plate.clipNumber, position, sceneUrl, plate.blobUrl, project.aspectRatio);
    }
  }
}

async function mergeOne(
  projectId: ObjectId,
  clipNumber: number,
  position: FramePosition,
  sceneUrl: string,
  plateUrl: string,
  aspect: "9:16" | "16:9" | "1:1",
) {
  try {
    const [scene, plate] = await Promise.all([
      fetchPng(sceneUrl, "場景圖"),
      fetchPng(plateUrl, "字幕圖"),
    ]);
    const png = await compositeSubtitleStill(scene, plate, aspect);
    const mergedUrl = await persistBuffer(
      png,
      `explainer/${projectId.toHexString()}/frames/c${clipNumber}-${position}-subtitle.png`,
      "image/png",
    );
    const projects = await videosCollection();
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          "frames.$[frame].mergedUrl": mergedUrl,
          "frames.$[frame].mergedSceneUrl": sceneUrl,
          "frames.$[frame].mergedPlateUrl": plateUrl,
          "frames.$[frame].mergedAt": new Date().toISOString(),
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "frame.clipNumber": clipNumber, "frame.position": position }] },
    );
  } catch (error) {
    console.error("[subtitle-merge] failed", { projectId, clipNumber, position, error });
  }
}

async function fetchPng(url: string, label: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法下載${label}`);
  return Buffer.from(await response.arrayBuffer());
}
