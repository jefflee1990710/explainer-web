import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { AppUser } from "@/types/user";
import type { Subscription } from "@/types/subscription";
import type { Skill } from "@/types/skill";
import type { Folder } from "@/types/folder";
import type { Project } from "@/types/project";
import type { GenerationJob } from "@/types/generation-job";
import type { BillingSettings } from "@/types/billing-settings";
import type { Character } from "@/types/character";
import type { StyleDoc } from "@/types/style-doc";
import type {
  AffiliateLedgerEntry,
  AffiliateProfile,
  CreditLot,
  PayoutRequest,
} from "@/types/affiliate";
import type { McpApiKey, McpToolCall } from "@/types/mcp";

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
  Collection<OptionalId<Folder>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Folder>>("projects");
}

export async function videosCollection(): Promise<
  Collection<OptionalId<Project>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Project>>("videos");
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

export async function charactersCollection(): Promise<
  Collection<OptionalId<Character>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Character>>("characters");
}

export async function stylesCollection(): Promise<Collection<StyleDoc>> {
  const db = await getDb();
  return db.collection<StyleDoc>("styles");
}

export async function affiliatesCollection(): Promise<
  Collection<OptionalId<AffiliateProfile>>
> {
  const db = await getDb();
  return db.collection<OptionalId<AffiliateProfile>>("affiliates");
}

export async function affiliateLedgerCollection(): Promise<
  Collection<OptionalId<AffiliateLedgerEntry>>
> {
  const db = await getDb();
  return db.collection<OptionalId<AffiliateLedgerEntry>>("affiliateLedger");
}

export async function creditLotsCollection(): Promise<
  Collection<OptionalId<CreditLot>>
> {
  const db = await getDb();
  return db.collection<OptionalId<CreditLot>>("creditLots");
}

export async function payoutRequestsCollection(): Promise<
  Collection<OptionalId<PayoutRequest>>
> {
  const db = await getDb();
  return db.collection<OptionalId<PayoutRequest>>("payoutRequests");
}

export async function mcpApiKeysCollection(): Promise<
  Collection<OptionalId<McpApiKey>>
> {
  const db = await getDb();
  return db.collection<OptionalId<McpApiKey>>("mcpApiKeys");
}

export async function mcpToolCallsCollection(): Promise<
  Collection<OptionalId<McpToolCall>>
> {
  const db = await getDb();
  return db.collection<OptionalId<McpToolCall>>("mcpToolCalls");
}
