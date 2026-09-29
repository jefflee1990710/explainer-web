import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { SignupConsent } from "@/presentation/components/legal/signup-consent";

export default function SignUpPage() {
  return (
    <PolicyLayout>
      <SignupConsent />
    </PolicyLayout>
  );
}
