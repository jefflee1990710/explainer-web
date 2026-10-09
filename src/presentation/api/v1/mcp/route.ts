import { apiError, apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { createMcpKeyAction, getMcpDashboardData, revokeMcpKeyAction } from "@/service/mcp/key-actions";

// MCP dashboard: endpoint, active keys, and 30-day usage.
export const GET = withApiUser(async () => {
  return apiJson(await getMcpDashboardData());
});

// Create a key ({ name? }); the secret is returned once.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<{ name?: string }>(request);
  return fromResult(await createMcpKeyAction(body.name), 201);
});

// Revoke a key: `?id=<keyId>`.
export const DELETE = withApiUser(async ({ request }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return apiError("缺少 id");
  return fromResult(await revokeMcpKeyAction(id));
});
