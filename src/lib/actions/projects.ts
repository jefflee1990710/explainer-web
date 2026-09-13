"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { projectsCollection, skillsCollection } from "@/lib/collections";
import { runPhaseA } from "@/lib/director/run-phase-a";
import { toPublicProject, type PublicProject } from "@/lib/serialize";
import type { AspectRatio, DurationPreset } from "@/types/project";

export async function createProjectAction(formData: FormData): Promise<
  | { ok: true; project: PublicProject }
  | { ok: false; error: string }
> {
  try {
    const user = await requireAppUser();
    const skillSlug = String(formData.get("skillSlug") || "");
    const source = String(formData.get("source") || "").trim();
    const aspectRatio = String(formData.get("aspectRatio") || "") as AspectRatio;
    const durationPreset = String(
      formData.get("durationPreset") || "",
    ) as DurationPreset;
    const characterImageUrl =
      String(formData.get("characterImageUrl") || "").trim() || undefined;

    if (!source) return { ok: false, error: "請提供題材或腳本" };
    if (!["16:9", "9:16", "1:1"].includes(aspectRatio)) {
      return { ok: false, error: "請選擇畫面比例" };
    }
    if (!["micro", "short", "punchy", "full"].includes(durationPreset)) {
      return { ok: false, error: "請選擇片長" };
    }

    const skills = await skillsCollection();
    const skill = await skills.findOne({ slug: skillSlug, isActive: true });
    if (!skill) return { ok: false, error: "找不到技能" };

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
      characterImageUrl,
      status: "phase_a",
      clips: [],
      creditCost: 0,
      creditsCharged: false,
      createdAt: now,
      updatedAt: now,
    });

    try {
      const phaseA = await runPhaseA({
        skill,
        source,
        aspectRatio,
        durationPreset,
        characterImageUrl,
      });

      await projects.updateOne(
        { _id: insert.insertedId },
        {
          $set: {
            phaseA,
            creditCost: phaseA.clipCount,
            status: "awaiting_approval",
            updatedAt: new Date(),
          },
        },
      );
    } catch (error) {
      await projects.updateOne(
        { _id: insert.insertedId },
        {
          $set: {
            status: "failed",
            error: error instanceof Error ? error.message : "導演提案失敗",
            updatedAt: new Date(),
          },
        },
      );
      throw error;
    }

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

export async function reviseProjectAction(formData: FormData): Promise<
  | { ok: true; project: PublicProject }
  | { ok: false; error: string }
> {
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

    const skills = await skillsCollection();
    const skill = await skills.findOne({ _id: project.skillId });
    if (!skill) return { ok: false, error: "找不到技能" };

    await projects.updateOne(
      { _id: project._id },
      { $set: { status: "phase_a", updatedAt: new Date() } },
    );

    const phaseA = await runPhaseA({
      skill,
      source: note
        ? `${project.source}\n\nRevision notes from user:\n${note}`
        : project.source,
      aspectRatio: project.aspectRatio,
      durationPreset: project.durationPreset,
      characterImageUrl: project.characterImageUrl,
    });

    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          phaseA,
          creditCost: phaseA.clipCount,
          status: "awaiting_approval",
          error: undefined,
          updatedAt: new Date(),
        },
      },
    );

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
