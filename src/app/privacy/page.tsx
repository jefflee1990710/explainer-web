import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { PrivacyDocument } from "@/presentation/components/legal/privacy-document";

export default function PrivacyPage() {
  return (
    <PolicyLayout>
      <PrivacyDocument />
    </PolicyLayout>
  );
}
