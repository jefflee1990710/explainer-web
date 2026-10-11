import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import {
  applyClipOrder,
  keepAppendedClipOnPreviousSet,
  placeAppendedClip,
} from "@/service/clip/clip-order";
import { APPEND_CLIP_MAX, draftAppendedClips } from "@/service/director/append-clip";
import { loadStoredSkill } from "@/service/director/load-skill";
import { isTalkingHeadSkill, talkingHeadSpokenError } from "@/service/director/talking-head";
import { isProjectBusy } from "@/service/clip-stage";
import { isProductionLike } from "@/service/project-status";
import { loadRenderableStyle } from "@/service/style/renderable-style";

const CONTENT_MAX = 2000;

type TimelineResult = { ok: true; project: PublicVideo } | { ok: false; error: string };

function revalidateVideo(projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${projectId}`);
}

function fail(error: unknown, fallback: string): TimelineResult {
  console.error(fallback, error);
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

// Director writes one new clip and appends it after the current last clip.
export async function appendDirectorClipAction(input: {
  videoId: string;
  content: string;
}): Promise<TimelineResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(input?.videoId ?? "");
    const content = String(input?.content ?? "").trim();
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
    if (!content) return { ok: false, error: "請輸入這一段的內容" };
    if (content.length > CONTENT_MAX) return { ok: false, error: "內容過長" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能新增片段" };

    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) return { ok: false, error: "分鏡尚未完成" };
    if (project.phaseA.clips.length >= APPEND_CLIP_MAX) {
      return { ok: false, error: `最多 ${APPEND_CLIP_MAX} 段` };
    }

    const talkingHead = isTalkingHeadSkill(project.skillSlug);
    if (talkingHead) {
      const spokenError = talkingHeadSpokenError(content, project.speechPace);
      if (spokenError) return { ok: false, error: spokenError };
    }

    const skill = await loadStoredSkill(project.skillId);
    if (!skill) return { ok: false, error: "找不到導演" };
    const style = await loadRenderableStyle({
      styleId: project.styleId,
      ownerClerkUserId: project.clerkUserId,
    });

    const drafted = await draftAppendedClips({
      skill,
      style,
      language: project.language,
      speechPace: project.speechPace,
      aspectRatio: project.aspectRatio,
      source: project.source,
      spokenScript: project.spokenScript,
      phaseA: project.phaseA,
      referenceImages: project.referenceImages,
      backgroundImageUrls: project.backgroundImageUrls,
      cast: project.cast,
      content,
    });
    if (drafted.length === 0) return { ok: false, error: "導演沒有寫出片段" };
    if (project.phaseA.clips.length + drafted.length > APPEND_CLIP_MAX) {
      return { ok: false, error: `最多 ${APPEND_CLIP_MAX} 段` };
    }

    let phaseA = project.phaseA;
    for (const row of drafted) {
      phaseA = placeAppendedClip(phaseA, row, { language: project.language, talkingHead });
    }
    const attached = keepAppendedClipOnPreviousSet({ ...project, phaseA }, drafted.length);
    const now = new Date();
    const wrote = await videos.updateOne(
      { _id: project._id, clerkUserId: user.clerkUserId },
      {
        $set: {
          phaseA: attached.phaseA,
          ...(attached.backgroundPlates ? { backgroundPlates: attached.backgroundPlates } : {}),
          ...(talkingHead
            ? { spokenScript: [project.spokenScript?.trim(), content].filter(Boolean).join("\n") }
            : {}),
          updatedAt: now,
        },
      },
    );
    if (wrote.matchedCount !== 1) return { ok: false, error: "專案不存在" };
    const updated = await videos.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(String(project.projectId));
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "新增片段失敗，請再試一次");
  }
}

// Persist a filmstrip drag. `order` is the previous clip numbers in the new order.
export async function reorderClipsAction(videoId: string, order: number[]): Promise<TimelineResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId) || !Array.isArray(order)) {
      return { ok: false, error: "專案不存在" };
    }
    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (isProjectBusy(project)) return { ok: false, error: "片段還在生成，請完成後再調整順序" };

    const next = applyClipOrder(project, order);
    if (!next.ok) return next;
    const now = new Date();
    const wrote = await videos.updateOne(
      { _id: project._id, clerkUserId: user.clerkUserId },
      {
        $set: {
          phaseA: next.project.phaseA,
          clips: next.project.clips,
          frames: next.project.frames ?? [],
          ...(next.project.sceneChats ? { sceneChats: next.project.sceneChats } : {}),
          ...(next.project.backgroundPlates ? { backgroundPlates: next.project.backgroundPlates } : {}),
          ...(next.project.phaseB ? { phaseB: next.project.phaseB } : {}),
          ...(next.project.autoVideoClips ? { autoVideoClips: next.project.autoVideoClips } : {}),
          ...(next.project.edit ? { edit: next.project.edit } : {}),
          updatedAt: now,
        },
      },
    );
    if (wrote.matchedCount !== 1) return { ok: false, error: "專案不存在" };
    const updated = await videos.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(String(project.projectId));
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "調整順序失敗，請再試一次");
  }
}
