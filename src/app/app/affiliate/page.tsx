import { redirect } from "next/navigation";
import { getAffiliateDashboardData } from "@/presentation/actions/affiliate";
import { AffiliateView } from "@/presentation/components/app/affiliate/affiliate-view";
import { isAffiliateAccount } from "@/service/affiliate/enabled";
import { requireAppUser } from "@/service/auth";

export default async function AffiliatePage() {
  const user = await requireAppUser();
  if (!isAffiliateAccount(user)) redirect("/app");
  const data = await getAffiliateDashboardData();
  return <AffiliateView {...data} />;
}
