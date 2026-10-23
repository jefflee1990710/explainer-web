import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { StudioPowertoolsBand } from "@/presentation/components/studio-powertools-band";
import { getAuthSession } from "@/service/auth";
import { marketingPageMetadata } from "@/util/i18n/marketing-page-meta";
import { RightToolCta } from "./right-tool-cta";
import { RightToolExamples } from "./right-tool-examples";
import { RightToolPost } from "./right-tool-post";
import { RightToolDirectors } from "./right-tool-directors";
import { RightToolEdit } from "./right-tool-edit";
import { RightToolHero } from "./right-tool-hero";
import { RightToolInfluencer } from "./right-tool-influencer";
import { RightToolPain } from "./right-tool-pain";

export const generateMetadata = () => marketingPageMetadata("rightTool");

// Marketing: directors + influencer tools + edit-after-generate pipeline.
export default async function RightToolPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session);
  return (
    <PolicyLayout>
      <RightToolHero signedIn={signedIn} />
      <RightToolPain signedIn={signedIn} />
      <RightToolDirectors />
      <RightToolInfluencer />
      <RightToolEdit signedIn={signedIn} />
      <StudioPowertoolsBand signedIn={signedIn} tone="dark" />
      <RightToolExamples />
      <RightToolPost />
      <RightToolCta signedIn={signedIn} />
    </PolicyLayout>
  );
}
