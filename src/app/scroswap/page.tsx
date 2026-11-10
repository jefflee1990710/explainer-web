import { PublicStudioCreationHub } from "@/presentation/components/economy/public-studio-creation-hub";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { listPublicStyles } from "@/service/style/list";

export const dynamic = "force-dynamic";

export default async function PublicScroSwapCreationPage() {
  const [session, styles] = await Promise.all([
    getAuthSession(),
    listPublicStyles(),
  ]);
  const signedIn = Boolean(session);

  return (
    <PolicyLayout>
      <PublicStudioCreationHub mode="scroswap" signedIn={signedIn} styles={styles} />
    </PolicyLayout>
  );
}
