import type { OptionalId } from "mongodb";
import { mcpToolCallsCollection } from "@/dao";
import type { McpApiKey, McpToolCall } from "@/model/mcp";
import type { AppUser } from "@/model/user";

function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

async function logCall(input: {
  user: AppUser;
  apiKey: McpApiKey;
  tool: string;
  ok: boolean;
  error?: string;
  latencyMs: number;
  creditsCharged: number;
}) {
  const col = await mcpToolCallsCollection();
  const doc: OptionalId<McpToolCall> = {
    clerkUserId: input.user.clerkUserId,
    apiKeyId: input.apiKey._id,
    tool: input.tool,
    ok: input.ok,
    error: input.error,
    latencyMs: input.latencyMs,
    creditsCharged: input.creditsCharged,
    createdAt: new Date(),
  };
  await col.insertOne(doc).catch(() => {});
}

// Run a tool, log the call, and return MCP text content.
export function wrapTool<TArgs>(
  user: AppUser,
  apiKey: McpApiKey,
  tool: string,
  // Fixed cost, or one read from the tool result (per-second video pricing).
  creditsCharged: number | ((result: unknown, args: TArgs) => number),
  fn: (args: TArgs) => Promise<unknown>,
) {
  return async (args: TArgs) => {
    const started = Date.now();
    try {
      const result = await fn(args);
      await logCall({
        user,
        apiKey,
        tool,
        ok: true,
        latencyMs: Date.now() - started,
        creditsCharged:
          typeof creditsCharged === "function" ? creditsCharged(result, args) : creditsCharged,
      });
      return textResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool failed";
      await logCall({
        user,
        apiKey,
        tool,
        ok: false,
        error: message,
        latencyMs: Date.now() - started,
        creditsCharged: 0,
      });
      return errorResult(message);
    }
  };
}

// Server actions return `{ ok: false, error }`. Tools throw so wrapTool logs the failure.
export function unwrap<T extends { ok: boolean; error?: string }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(result.error || "Tool failed");
  return result as Extract<T, { ok: true }>;
}
