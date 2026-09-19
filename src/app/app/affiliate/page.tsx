import { getAffiliateDashboardData } from "@/lib/actions/affiliate";
import { AffiliateView } from "./affiliate-view";

export default async function AffiliatePage() {
  const data = await getAffiliateDashboardData();
  return <AffiliateView {...data} />;
}
