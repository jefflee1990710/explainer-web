import type { AppUser } from "@/types/user";
import type { Project } from "@/types/project";
import type { Skill } from "@/types/skill";
import type { Subscription } from "@/types/subscription";

export type PublicSkill = {
  id: string;
  slug: string;
  title: string;
  titleZh: string;
  description: string;
};

export type PublicProject = {
  id: string;
  skillSlug: string;
  source: string;
  aspectRatio: Project["aspectRatio"];
  durationPreset: Project["durationPreset"];
  characterImageUrl?: string;
  characterStillUrl?: string;
  status: Project["status"];
  phaseA?: Project["phaseA"];
  clips: Project["clips"];
  creditCost: number;
  error?: string;
  createdAt: string;
};

export function toPublicSkill(skill: Skill): PublicSkill {
  return {
    id: skill._id.toHexString(),
    slug: skill.slug,
    title: skill.title,
    titleZh: skill.titleZh,
    description: skill.description,
  };
}

export function toPublicProject(project: Project): PublicProject {
  return {
    id: project._id.toHexString(),
    skillSlug: project.skillSlug,
    source: project.source,
    aspectRatio: project.aspectRatio,
    durationPreset: project.durationPreset,
    characterImageUrl: project.characterImageUrl,
    characterStillUrl: project.characterStillUrl,
    status: project.status,
    phaseA: project.phaseA,
    clips: project.clips,
    creditCost: project.creditCost,
    error: project.error,
    createdAt: project.createdAt.toISOString(),
  };
}

export function publicUser(user: AppUser) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    name: user.name,
    credits: user.credits,
  };
}

export function publicSubscription(sub: Subscription | null) {
  if (!sub) return null;
  return {
    planId: sub.planId,
    status: sub.status,
    monthlyCredits: sub.monthlyCredits,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
  };
}
