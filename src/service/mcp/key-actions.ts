import { revalidatePath } from "next/cache";
import { requireAppUser } from "@/service/auth";
import {
  createMcpApiKey,
  listMcpApiKeys,
  revokeMcpApiKey,
} from "@/service/mcp/api-keys";
import { mcpToolCallsCollection } from "@/dao";
import { getAppUrl } from "@/util/app-url";

export async function createMcpKeyAction(name?: string) {
  try {
    const user = await requireAppUser();
    const key = await createMcpApiKey(user, name || "Default");
    revalidatePath("/app/mcp");
    return { ok: true as const, secret: key.secret, id: key.id, name: key.name };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "建立失敗",
    };
  }
}

export async function revokeMcpKeyAction(keyId: string) {
  try {
    const user = await requireAppUser();
    const ok = await revokeMcpApiKey(user.clerkUserId, keyId);
    if (!ok) return { ok: false as const, error: "找不到這把 key" };
    revalidatePath("/app/mcp");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "撤銷失敗",
    };
  }
}

export async function getMcpDashboardData() {
  const user = await requireAppUser();
  const keys = await listMcpApiKeys(user.clerkUserId);
  const endpoint = `${getAppUrl()}/api/mcp`;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const calls = await mcpToolCallsCollection();
  const recent = await calls
    .find({ clerkUserId: user.clerkUserId, createdAt: { $gte: since } })
    .toArray();

  const total = recent.length;
  const errors = recent.filter((c) => !c.ok).length;
  const credits = recent.reduce((sum, c) => sum + (c.creditsCharged || 0), 0);
  const byToolMap = new Map<string, { calls: number; errors: number; credits: number }>();
  for (const call of recent) {
    const row = byToolMap.get(call.tool) || { calls: 0, errors: 0, credits: 0 };
    row.calls += 1;
    if (!call.ok) row.errors += 1;
    row.credits += call.creditsCharged || 0;
    byToolMap.set(call.tool, row);
  }

  const byTool = Array.from(byToolMap.entries())
    .map(([tool, stats]) => ({ tool, ...stats }))
    .sort((a, b) => b.calls - a.calls);

  return {
    endpoint,
    keys: keys.map((k) => ({
      id: k._id.toHexString(),
      name: k.name,
      keyPrefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt?.toISOString() || null,
      createdAt: k.createdAt.toISOString(),
    })),
    usage: {
      total,
      credits,
      errorRate: total === 0 ? 0 : Math.round((errors / total) * 1000) / 10,
      byTool,
    },
  };
}
