import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { AppUser } from "@/types/user";
import type { Subscription } from "@/types/subscription";
import type { Skill } from "@/types/skill";
import type { Project } from "@/types/project";
import type { GenerationJob } from "@/types/generation-job";
import type { BillingSettings } from "@/types/billing-settings";

export async function usersCollection(): Promise<Collection<OptionalId<AppUser>>> {
  const db = await getDb();
  return db.collection<OptionalId<AppUser>>("users");
}

export async function subscriptionsCollection(): Promise<
  Collection<OptionalId<Subscription>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Subscription>>("subscriptions");
}

export async function skillsCollection(): Promise<Collection<OptionalId<Skill>>> {
  const db = await getDb();
  return db.collection<OptionalId<Skill>>("skills");
}

export async function projectsCollection(): Promise<
  Collection<OptionalId<Project>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Project>>("projects");
}

export async function generationJobsCollection(): Promise<
  Collection<OptionalId<GenerationJob>>
> {
  const db = await getDb();
  return db.collection<OptionalId<GenerationJob>>("generationJobs");
}

export async function billingSettingsCollection(): Promise<
  Collection<OptionalId<BillingSettings>>
> {
  const db = await getDb();
  return db.collection<OptionalId<BillingSettings>>("settings");
}
