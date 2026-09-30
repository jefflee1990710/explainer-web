import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { AuthForm } from "@/presentation/components/auth/auth-form";

export default function SignUpPage() {
  return (
    <PolicyLayout>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <AuthForm mode="sign-up" />
      </div>
    </PolicyLayout>
  );
}
