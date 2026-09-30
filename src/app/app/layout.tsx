import { redirect } from "next/navigation";
import { AppShell } from "@/presentation/components/app-shell";
import { AcceptPoliciesDialog } from "@/presentation/components/legal/accept-policies-dialog";
import { getAuthSession, requireAppUser } from "@/service/auth";
import { countActiveTasks } from "@/service/generation/task-list";
import { needsPolicyAcceptance } from "@/service/legal/versions";

// Header meter count; a DB hiccup must not take down the whole app shell.
async function safeCountActiveTasks(clerkUserId: string) {
  try {
    return await countActiveTasks(clerkUserId);
  } catch (error) {
    console.error("countActiveTasks failed", error);
    return 0;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/sign-in?next=/app");
  const user = await requireAppUser();
  const activeTasks = await safeCountActiveTasks(user.clerkUserId);
  return (
    <>
      <AppShell credits={user.credits} creditLimit={user.creditLimit || 0} activeTasks={activeTasks}>
        {children}
      </AppShell>
      {needsPolicyAcceptance(user) ? (
        <AcceptPoliciesDialog firstTime={!user.legalAcceptance} />
      ) : null}
    </>
  );
}
