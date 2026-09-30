import { redirect } from "next/navigation";
import { getAffiliateDashboardData } from "@/presentation/actions/affiliate";
import { AffiliateView } from "@/presentation/components/app/affiliate/affiliate-view";
import { AFFILIATE_ENABLED } from "@/service/affiliate/enabled";

export default async function AffiliatePage() {
  if (!AFFILIATE_ENABLED) redirect("/app");
  const data = await getAffiliateDashboardData();
  return <AffiliateView {...data} />;
}
