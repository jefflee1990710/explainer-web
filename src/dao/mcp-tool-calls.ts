import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { McpToolCall } from "@/model/mcp";

export async function mcpToolCallsCollection(): Promise<
  Collection<OptionalId<McpToolCall>>
> {
  const db = await getDb();
  return db.collection<OptionalId<McpToolCall>>("mcpToolCalls");
}
