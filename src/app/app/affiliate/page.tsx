import { getAffiliateDashboardData } from "@/presentation/actions/affiliate";
import { AffiliateView } from "@/presentation/components/app/affiliate/affiliate-view";

export default async function AffiliatePage() {
  const data = await getAffiliateDashboardData();
  return <AffiliateView {...data} />;
}
