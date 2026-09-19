import { getMcpDashboardData } from "@/lib/actions/mcp";
import { McpView } from "./mcp-view";

export default async function McpPage() {
  const data = await getMcpDashboardData();
  return <McpView {...data} />;
}
