"use server";

import * as service from "@/service/mcp/key-actions";

export async function createMcpKeyAction(
  ...args: Parameters<typeof service.createMcpKeyAction>
) {
  return service.createMcpKeyAction(...args);
}

export async function revokeMcpKeyAction(
  ...args: Parameters<typeof service.revokeMcpKeyAction>
) {
  return service.revokeMcpKeyAction(...args);
}

export async function getMcpDashboardData(
  ...args: Parameters<typeof service.getMcpDashboardData>
) {
  return service.getMcpDashboardData(...args);
}
