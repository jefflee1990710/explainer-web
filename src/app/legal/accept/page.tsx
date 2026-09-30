import { redirect } from "next/navigation";
import { getAuthSession } from "@/service/auth";

// Acceptance now happens in the app dialog. Keep the old URL pointed at that screen.
export default async function AcceptPoliciesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/sign-in?next=/app");
  redirect("/app");
}
