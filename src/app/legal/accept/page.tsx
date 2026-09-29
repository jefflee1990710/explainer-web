import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AcceptPoliciesForm } from "@/presentation/components/legal/accept-policies-form";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { requireAppUser } from "@/service/auth";
import { needsPolicyAcceptance } from "@/service/legal/versions";

export default async function AcceptPoliciesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await requireAppUser();
  if (!needsPolicyAcceptance(user)) redirect("/app");

  return (
    <PolicyLayout>
      <AcceptPoliciesForm />
    </PolicyLayout>
  );
}
