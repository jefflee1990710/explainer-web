import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { McpApiKey } from "@/model/mcp";

export async function mcpApiKeysCollection(): Promise<
  Collection<OptionalId<McpApiKey>>
> {
  const db = await getDb();
  return db.collection<OptionalId<McpApiKey>>("mcpApiKeys");
}
