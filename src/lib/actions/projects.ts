"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { resolveDefaultVersion } from "@/lib/characters/versions";
import {
  charactersCollection,
  generationJobsCollection,
  projectsCollection,
  skillsCollection,
  videosCollection,
} from "@/lib/collections";
import { runPhaseAJob } from "@/lib/director/jobs";
import { isVoLanguage } from "@/lib/director/languages";
import { sanitizeFolderName } from "@/lib/folder";
import { failedStepFor } from "@/lib/project-status";
import { toPublicVideo, type PublicVideo } from "@/lib/serialize";
import type { CastMember, Character } from "@/types/character";
import type { AspectRatio, DurationPreset } from "@/types/project";

const CAST_MAX = 4;

type VideoResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

type FolderResult =
  | { ok: true; folder: { id: string; name: string } }
  | { ok: false; error: string };

function revalidateFolder(folderId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${folderId}`);
}

function revalidateVideo(videoId: string, folderId?: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${folderId || videoId}`);
}

// Create a named folder (campaign). Videos are added separately.
export async function createFolderAction(name: string): Promise<FolderResult> {
  try {
    const user = await requireAppUser();
    const trimmed = sanitizeFolderName(name);
    if (!trimmed) return { ok: false as const, error: "請輸入專案名稱" };
    const folders = await projectsCollection();
    const now = new Date();
    const insert = await folders.insertOne({
      userId: user._id,
      clerkUserId: user.clerkUserId,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    });
    revalidatePath("/app");
    return {
      ok: true as const,
      folder: { id: insert.insertedId.toHexString(), name: trimmed },
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "建立專案失敗",
    };
  }
}

// Rename a folder the signed-in user owns.
export async function renameFolderAction(
  folderId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    const trimmed = sanitizeFolderName(name);
    if (!trimmed) return { ok: false as const, error: "請輸入專案名稱" };
    if (!ObjectId.isValid(folderId)) {
      return { ok: false as const, error: "專案不存在" };
    }

    const folders = await projectsCollection();
    const result = await folders.updateOne(
      { _id: new ObjectId(folderId), clerkUserId: user.clerkUserId },
      { $set: { name: trimmed, updatedAt: new Date() } },
    );
    if (result.matchedCount === 0) {
      return { ok: false as const, error: "專案不存在" };
    }

    revalidateFolder(folderId);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "重新命名失敗",
    };
  }
}

// Create a video inside an existing folder and schedule Phase A.
// The client polls `getVideoAction` until status leaves "phase_a".
export async function createVideoAction(
  formData: FormData,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    const projectId = String(formData.get("projectId") || "");
    const skillSlug = String(formData.get("skillSlug") || "");
    const source = String(formData.get("source") || "").trim();
    const aspectRatio = String(formData.get("aspectRatio") || "") as AspectRatio;
    const durationPreset = String(
      formData.get("durationPreset") || "",
    ) as DurationPreset;
    const language = String(formData.get("language") || "en");
    // Dedupe so a double-posted id doesn't fail the existence check.
    const characterIds = Array.from(
      new Set(
        formData
          .getAll("characterIds")
          .map(String)
          .filter((id) => ObjectId.isValid(id)),
      ),
    );
    if (characterIds.length > CAST_MAX) {
      return { ok: false, error: `最多選 ${CAST_MAX} 個角色` };
    }

    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }
    if (!source) return { ok: false, error: "請提供題材或腳本" };
    if (!["16:9", "9:16", "1:1"].includes(aspectRatio)) {
      return { ok: false, error: "請選擇畫面比例" };
    }
    if (!["micro", "short", "punchy", "full"].includes(durationPreset)) {
      return { ok: false, error: "請選擇片長" };
    }
    if (!isVoLanguage(language)) {
      return { ok: false, error: "請選擇旁白語言" };
    }

    const folders = await projectsCollection();
    const folder = await folders.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!folder) return { ok: false, error: "專案不存在" };

    const skills = await skillsCollection();
    const skill = await skills.findOne({ slug: skillSlug, isActive: true });
    if (!skill) return { ok: false, error: "找不到風格" };

    let cast: CastMember[] = [];
    if (characterIds.length > 0) {
      const characters = await charactersCollection();
      const docs = (await characters
        .find({
          _id: { $in: characterIds.map((id) => new ObjectId(id)) },
          clerkUserId: user.clerkUserId,
        })
        .toArray()) as Character[];
      if (docs.length !== characterIds.length) {
        return { ok: false, error: "有角色不存在" };
      }
      cast = [];
      for (const id of characterIds) {
        const character = docs.find((doc) => doc._id.toHexString() === id)!;
        const version = resolveDefaultVersion(character);
        if (!version?.blueprintUrl) {
          return { ok: false, error: `角色 ${character.name} 尚未有可用藍圖` };
        }
        cast.push({
          characterId: character._id,
          versionId: version.id,
          name: character.name,
          blueprintUrl: version.blueprintUrl,
          prompt: version.prompt,
        });
      }
    }

    const now = new Date();
    const videos = await videosCollection();
    const insert = await videos.insertOne({
      projectId: folder._id,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      skillId: skill._id,
      skillSlug: skill.slug,
      source,
      aspectRatio,
      durationPreset,
      language,
      cast,
      status: "phase_a",
      clips: [],
      creditCost: 0,
      creditsCharged: false,
      createdAt: now,
      updatedAt: now,
    });

    after(() => runPhaseAJob(insert.insertedId));
    await folders.updateOne(
      { _id: folder._id },
      { $set: { updatedAt: new Date() } },
    );

    const video = await videos.findOne({ _id: insert.insertedId });
    revalidateFolder(projectId);
    return { ok: true, project: toPublicVideo(video!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "建立專案失敗",
    };
  }
}

// Keep the old name until the create form is switched in Task 6.
export const createProjectAction = createVideoAction;

// Re-run Phase A with user notes; also non-blocking.
export async function reviseProjectAction(
  formData: FormData,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(formData.get("projectId") || "");
    const note = String(formData.get("note") || "").trim();
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
    if (video.status !== "awaiting_approval" && video.status !== "failed") {
      return { ok: false, error: "這個專案目前不能改稿" };
    }

    await videos.updateOne(
      { _id: video._id },
      { $set: { status: "phase_a", error: undefined, updatedAt: new Date() } },
    );

    after(() => runPhaseAJob(video._id, note || undefined));

    const folders = await projectsCollection();
    await folders.updateOne(
      { _id: video.projectId },
      { $set: { updatedAt: new Date() } },
    );

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(videoId, video.projectId.toHexString());
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "改稿失敗",
    };
  }
}

// Retry a failed video by moving it back to the gate it fell over on.
// Credits for the failed stage were already refunded by the pipeline, so
// no charge happens here; the user re-approves and pays again explicitly.
export async function retryProjectAction(
  projectId: string,
): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
    if (video.status !== "failed") {
      return { ok: false, error: "只有失敗的專案可以重試" };
    }

    const jobs = await generationJobsCollection();
    const step = failedStepFor(video);

    if (step === 1) {
      // Storyboard never landed: rerun Phase A in the background.
      await videos.updateOne(
        { _id: video._id },
        { $set: { status: "phase_a", error: undefined, updatedAt: new Date() } },
      );
      after(() => runPhaseAJob(video._id));
    } else if (step === 2) {
      // Frames stage failed: drop stale still/frame jobs and go back to the
      // storyboard approval gate so frames can be re-ordered.
      await jobs.deleteMany({
        projectId: video._id,
        kind: { $in: ["still", "frame"] },
        status: { $in: ["failed", "nsfw"] },
      });
      await videos.updateOne(
        { _id: video._id },
        {
          $set: {
            status: "awaiting_approval",
            frames: [],
            framesCreditCost: 0,
            framesCharged: false,
            error: undefined,
            updatedAt: new Date(),
          },
          $unset: { framesSubmittedAt: "" },
        },
      );
    } else {
      // Video stage failed: clear video jobs/clips and return to frames gate.
      await jobs.deleteMany({ projectId: video._id, kind: "video" });
      await videos.updateOne(
        { _id: video._id },
        {
          $set: {
            status: "frames_ready",
            clips: [],
            creditsCharged: false,
            error: undefined,
            updatedAt: new Date(),
          },
          $unset: { phaseB: "" },
        },
      );
    }

    const folders = await projectsCollection();
    await folders.updateOne(
      { _id: video.projectId },
      { $set: { updatedAt: new Date() } },
    );

    const updated = await videos.findOne({ _id: video._id });
    revalidateVideo(projectId, video.projectId.toHexString());
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "重試失敗",
    };
  }
}

// Lightweight read used by the client while a background job is running.
export async function getVideoAction(videoId: string): Promise<VideoResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }
    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
    return { ok: true, project: toPublicVideo(video) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "讀取專案失敗",
    };
  }
}

// Keep the old name until the poll hook is switched.
export const getProjectAction = getVideoAction;
