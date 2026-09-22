import { getMcpDashboardData } from "@/presentation/actions/mcp";
import { McpView } from "@/presentation/components/app/mcp/mcp-view";

export default async function McpPage() {
  const data = await getMcpDashboardData();
  return <McpView {...data} />;
}
