import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { AuthForm } from "@/presentation/components/auth/auth-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <PolicyLayout>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <AuthForm mode="sign-in" nextPath={params.next} />
      </div>
    </PolicyLayout>
  );
}
