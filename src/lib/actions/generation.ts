"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { assertCanSpendCredits, consumeCredits } from "@/lib/billing/credits";
import { projectsCollection, skillsCollection } from "@/lib/collections";
import { runPhaseB } from "@/lib/director/run-phase-b";
import {
  refreshProjectJobs,
  startProjectGeneration,
} from "@/lib/higgsfield/pipeline";
import { toPublicProject, type PublicProject } from "@/lib/serialize";

export async function approveAndGenerateAction(
  projectId: string,
): Promise<{ ok: true; project: PublicProject } | { ok: false; error: string }> {
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
    if (!project?.phaseA) return { ok: false, error: "尚未有可核准的分鏡" };
    if (project.status !== "awaiting_approval") {
      return { ok: false, error: "這個專案目前不能產片" };
    }

    const cost = project.phaseA.clipCount;
    await assertCanSpendCredits(user, cost);
    await consumeCredits(user.clerkUserId, cost);

    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          status: "approved",
          creditCost: cost,
          creditsCharged: true,
          updatedAt: new Date(),
        },
      },
    );

    const skills = await skillsCollection();
    const skill = await skills.findOne({ _id: project.skillId });
    if (!skill) return { ok: false, error: "找不到技能" };

    const phaseB = await runPhaseB({
      skill,
      phaseA: project.phaseA,
      characterImageUrl: project.characterImageUrl,
    });

    await projects.updateOne(
      { _id: project._id },
      { $set: { phaseB, updatedAt: new Date() } },
    );

    const ready = await projects.findOne({ _id: project._id });
    await startProjectGeneration(ready!);

    const updated = await projects.findOne({ _id: project._id });
    revalidatePath("/app");
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath("/app/billing");
    return { ok: true, project: toPublicProject(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產片失敗",
    };
  }
}

export async function refreshGenerationAction(
  projectId: string,
): Promise<{ ok: true; project: PublicProject } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }
    const id = new ObjectId(projectId);
    const projects = await projectsCollection();
    const project = await projects.findOne({
      _id: id,
      clerkUserId: user.clerkUserId,
    });
    if (!project) return { ok: false, error: "專案不存在" };

    if (project.status === "generating") {
      await refreshProjectJobs(id);
    }

    const updated = await projects.findOne({ _id: id });
    return { ok: true, project: toPublicProject(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "更新進度失敗",
    };
  }
}
