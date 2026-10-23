import { ExamplesView } from "@/presentation/components/examples-view";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";

export default async function ExamplesPage() {
  const session = await getAuthSession();
  return (
    <PolicyLayout>
      <ExamplesView signedIn={Boolean(session)} />
    </PolicyLayout>
  );
}
