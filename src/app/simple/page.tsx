import { CanvasTemplateLauncher } from "@/presentation/components/canvas-template-launcher";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { StudioPowertoolsBand } from "@/presentation/components/studio-powertools-band";
import { getAuthSession } from "@/service/auth";

export const dynamic = "force-dynamic";

export default async function SimpleMarketingCreationPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session);

  return (
    <PolicyLayout>
      <CanvasTemplateLauncher templateId="text-image-video" signedIn={signedIn} />
      <StudioPowertoolsBand signedIn={signedIn} />
    </PolicyLayout>
  );
}
