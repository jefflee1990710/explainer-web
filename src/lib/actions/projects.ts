"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import {
  generationJobsCollection,
  projectsCollection,
  skillsCollection,
} from "@/lib/collections";
import { runPhaseAJob } from "@/lib/director/jobs";
import { isVoLanguage } from "@/lib/director/languages";
import { failedStepFor } from "@/lib/project-status";
import { toPublicProject, type PublicProject } from "@/lib/serialize";
import type { AspectRatio, DurationPreset } from "@/types/project";

type ProjectResult =
  | { ok: true; project: PublicProject }
  | { ok: false; error: string };

// Create the project row and schedule Phase A after the response is sent.
// The client polls `getProjectAction` until status leaves "phase_a".
export async function createProjectAction(
  formData: FormData,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    const skillSlug = String(formData.get("skillSlug") || "");
    const source = String(formData.get("source") || "").trim();
    const aspectRatio = String(formData.get("aspectRatio") || "") as AspectRatio;
    const durationPreset = String(
      formData.get("durationPreset") || "",
    ) as DurationPreset;
    const language = String(formData.get("language") || "en");
    const characterImageUrl =
      String(formData.get("characterImageUrl") || "").trim() || undefined;

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

    const skills = await skillsCollection();
    const skill = await skills.findOne({ slug: skillSlug, isActive: true });
    if (!skill) return { ok: false, error: "找不到風格" };

    const now = new Date();
    const projects = await projectsCollection();
    const insert = await projects.insertOne({
      userId: user._id,
      clerkUserId: user.clerkUserId,
      skillId: skill._id,
      skillSlug: skill.slug,
      source,
      aspectRatio,
      durationPreset,
      language,
      characterImageUrl,
      status: "phase_a",
      clips: [],
      creditCost: 0,
      creditsCharged: false,
      createdAt: now,
      updatedAt: now,
    });

    after(() => runPhaseAJob(insert.insertedId));

    const project = await projects.findOne({ _id: insert.insertedId });
    revalidatePath("/app");
    return { ok: true, project: toPublicProject(project!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "建立專案失敗",
    };
  }
}

// Re-run Phase A with user notes; also non-blocking.
export async function reviseProjectAction(
  formData: FormData,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    const projectId = String(formData.get("projectId") || "");
    const note = String(formData.get("note") || "").trim();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }

    const projects = await projectsCollection();
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!project) return { ok: false, error: "專案不存在" };
    if (project.status !== "awaiting_approval" && project.status !== "failed") {
      return { ok: false, error: "這個專案目前不能改稿" };
    }

    await projects.updateOne(
      { _id: project._id },
      { $set: { status: "phase_a", error: undefined, updatedAt: new Date() } },
    );

    after(() => runPhaseAJob(project._id, note || undefined));

    const updated = await projects.findOne({ _id: project._id });
    revalidatePath(`/app/projects/${projectId}`);
    return { ok: true, project: toPublicProject(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "改稿失敗",
    };
  }
}

// Retry a failed project by moving it back to the gate it fell over on.
// Credits for the failed stage were already refunded by the pipeline, so
// no charge happens here; the user re-approves and pays again explicitly.
export async function retryProjectAction(
  projectId: string,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }

    const projects = await projectsCollection();
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!project) return { ok: false, error: "專案不存在" };
    if (project.status !== "failed") {
      return { ok: false, error: "只有失敗的專案可以重試" };
    }

    const jobs = await generationJobsCollection();
    const step = failedStepFor(project);

    if (step === 1) {
      // Storyboard never landed: rerun Phase A in the background.
      await projects.updateOne(
        { _id: project._id },
        { $set: { status: "phase_a", error: undefined, updatedAt: new Date() } },
      );
      after(() => runPhaseAJob(project._id));
    } else if (step === 2) {
      // Frames stage failed: drop stale still/frame jobs and go back to the
      // storyboard approval gate so frames can be re-ordered.
      await jobs.deleteMany({
        projectId: project._id,
        kind: { $in: ["still", "frame"] },
        status: { $in: ["failed", "nsfw"] },
      });
      await projects.updateOne(
        { _id: project._id },
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
      await jobs.deleteMany({ projectId: project._id, kind: "video" });
      await projects.updateOne(
        { _id: project._id },
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

    const updated = await projects.findOne({ _id: project._id });
    revalidatePath("/app");
    revalidatePath(`/app/projects/${projectId}`);
    return { ok: true, project: toPublicProject(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "重試失敗",
    };
  }
}

// Lightweight read used by the client while a background job is running.
export async function getProjectAction(projectId: string): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }
    const projects = await projectsCollection();
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!project) return { ok: false, error: "專案不存在" };
    return { ok: true, project: toPublicProject(project) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "讀取專案失敗",
    };
  }
}
