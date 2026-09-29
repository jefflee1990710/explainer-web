import { SignIn } from "@clerk/nextjs";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";

export default function SignInPage() {
  return (
    <PolicyLayout>
      <div className="flex flex-1 items-center justify-center p-6">
        <SignIn fallbackRedirectUrl="/app" signUpUrl="/sign-up" />
      </div>
    </PolicyLayout>
  );
}
