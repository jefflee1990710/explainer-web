import { AffiliateIntro } from "./affiliate-intro";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";

export default async function AffiliateIntroPage() {
  const session = await getAuthSession();
  return (
    <PolicyLayout>
      <AffiliateIntro signedIn={Boolean(session)} />
    </PolicyLayout>
  );
}
