import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import type { Project } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { markUnsentClipVideos } from "@/service/clip/cancel-pending-video";
import { resolveClipProject } from "@/service/clip/clip-context";
import { generateClipFramesAction } from "@/service/clip/production";
import { folderVideoPath } from "@/service/folder-video-path";
import {
  applyClipStyleToStoryboardClips,
  canChangeClipStyle,
  resolveClipInspectorKind,
} from "@/service/opencut/clip-inspector-kind";
import { buildCast } from "@/service/project/actions";
import { isListedStyleId } from "@/service/style/list-selectable";

export type ApplyClipStyleResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

/**
 * Change one clip's visual `styleId` inside the OpenCut editor, redraw its frames in the new style,
 * and queue auto-video generation (`autoVideoClips`) so the clip video renders in the new style too.
 */
export async function applyClipStyle(input: {
  videoId: string;
  clipNumber: number;
  styleId: string;
}): Promise<ApplyClipStyleResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(input.videoId ?? "").trim();
    const clipNumber = Number(input.clipNumber);
    const cleanStyleId = String(input.styleId ?? "").trim();

    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }
    if (!Number.isInteger(clipNumber) || clipNumber < 1) {
      return { ok: false, error: "找不到這段分鏡" };
    }
    if (!isListedStyleId(cleanStyleId)) {
      return { ok: false, error: "請選擇有效的視覺風格" };
    }

    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) {
      return { ok: false, error: "專案不存在" };
    }

    const row = project.phaseA.clips.find((c) => c.clipNumber === clipNumber);
    if (!row) {
      return { ok: false, error: "找不到這段分鏡" };
    }

    const clipProj = resolveClipProject(project, clipNumber);
    const inspectorKind = resolveClipInspectorKind(clipProj.skillSlug ?? project.skillSlug);
    const framesInFlight = (project.frames || []).some(
      (f) =>
        f.clipNumber === clipNumber &&
        (f.status === "queued" || f.status === "in_progress"),
    );
    const videoInFlight = (project.clips || []).some(
      (c) =>
        c.clipNumber === clipNumber &&
        (c.status === "queued" || c.status === "in_progress"),
    );

    if (
      !canChangeClipStyle({
        stage: framesInFlight
          ? "frames_generating"
          : videoInFlight
            ? "video_generating"
            : "frames_ready",
        inspectorKind,
      })
    ) {
      return { ok: false, error: "這一段分鏡正在生成中，請稍後再更換風格" };
    }

    // If the clip or project has cast members that also have a completed version in the new style,
    // resolve that cast override so the character reference image matches the new style.
    const existingCast = (row.cast ?? project.cast ?? []) as NonNullable<Project["cast"]>;
    let castOverride: NonNullable<Project["cast"]> | undefined;
    if (existingCast.length > 0) {
      const charIds = existingCast.map((member) => member.characterId.toHexString());
      const built = await buildCast(user.clerkUserId, cleanStyleId, charIds);
      if (built.ok) {
        castOverride = built.cast;
      }
    }

    const nextClips = applyClipStyleToStoryboardClips(
      project.phaseA.clips,
      clipNumber,
      cleanStyleId,
      castOverride,
    );

    const now = new Date();
    await videos.updateOne(
      { _id: project._id },
      {
        $set: {
          "phaseA.clips": nextClips,
          updatedAt: now,
        },
        $addToSet: {
          autoVideoClips: clipNumber,
        },
      },
    );

    // Kick off frame regeneration in the new style (which then auto-starts the clip video on completion).
    const frameResult = await generateClipFramesAction(videoId, clipNumber);
    if (frameResult.ok) {
      return frameResult;
    }

    // Even if frame regeneration couldn't start immediately (e.g. credit gate), return the updated project style.
    const updated = (await videos.findOne({ _id: project._id })) ?? {
      ...project,
      phaseA: { ...project.phaseA, clips: nextClips },
      updatedAt: now,
    };
    try {
      revalidatePath(
        folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()),
      );
    } catch {
      // Non-request context
    }
    return {
      ok: true,
      project: toPublicVideo(await markUnsentClipVideos(updated)),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "更換分鏡風格失敗",
    };
  }
}
