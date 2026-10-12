import type { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import type { FramePosition } from "@/model/project";
import { TALKING_HEAD_SKILL_SLUG } from "@/service/director/talking-head";
import { plateLineStale } from "@/service/video-edit/subtitle-export";
import { overlayFramePlateUrl } from "@/service/video-edit/overlay-frame-plate";
import { compositeSubtitleStill } from "@/service/video-edit/merge-subtitle-still";
import { persistBuffer } from "@/service/higgsfield/persist";
import { mediaSrc } from "@/util/media-src";

// Overlay a subtitle plate onto each finished still. The clean file stays on
// blobUrl so the next still can lock to pixels without the words.
// Talking-head read puts the next clip's line on the end still.
export async function mergeReadySubtitleFrames(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.subtitleOverlay) return;

  const ready = (project.subtitlePlates || []).flatMap((plate) => {
    if (plate.status !== "completed" || !plate.blobUrl) return [];
    const spoken = project.phaseA?.clips.find((item) => item.clipNumber === plate.clipNumber);
    if (plateLineStale(plate, spoken?.englishVo)) return [];
    return [{ clipNumber: plate.clipNumber, blobUrl: plate.blobUrl }];
  });
  const clipNumbers = (project.phaseA?.clips || []).map((clip) => clip.clipNumber);
  const handoff = project.skillSlug === TALKING_HEAD_SKILL_SLUG;

  for (const clipNumber of clipNumbers) {
    for (const position of ["start", "end"] as const) {
      const plateUrl = overlayFramePlateUrl({
        handoff,
        clipNumber,
        position,
        clipNumbers,
        plates: ready,
      });
      if (!plateUrl) continue;
      const frame = project.frames?.find(
        (item) => item.clipNumber === clipNumber && item.position === position,
      );
      const sceneUrl = mediaSrc(frame);
      if (!frame || frame.status !== "completed" || !sceneUrl) continue;
      if (frame.mergedUrl && frame.mergedSceneUrl === sceneUrl && frame.mergedPlateUrl === plateUrl) {
        continue;
      }
      await mergeOne(projectId, clipNumber, position, sceneUrl, plateUrl, project.aspectRatio);
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
