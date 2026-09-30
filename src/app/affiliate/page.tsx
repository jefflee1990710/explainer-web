import { redirect } from "next/navigation";
import { AffiliateIntro } from "./affiliate-intro";
import { usersCollection } from "@/dao";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { isAffiliateAccount } from "@/service/affiliate/enabled";
import { getAuthSession } from "@/service/auth";

export default async function AffiliateIntroPage() {
  const session = await getAuthSession();
  if (!session) redirect("/");
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId: session.uid });
  if (!isAffiliateAccount(user)) redirect("/");
  return (
    <PolicyLayout>
      <AffiliateIntro signedIn />
    </PolicyLayout>
  );
}
