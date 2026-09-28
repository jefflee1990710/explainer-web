import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@/presentation/components/app-shell";
import { requireAppUser } from "@/service/auth";
import { countActiveTasks } from "@/service/generation/task-list";

// Sidebar badge count; a DB hiccup must not take down the whole app shell.
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
  await auth.protect();
  const user = await requireAppUser();
  const activeTasks = await safeCountActiveTasks(user.clerkUserId);
  return (
    <AppShell credits={user.credits} creditLimit={user.creditLimit || 0} activeTasks={activeTasks}>
      {children}
    </AppShell>
  );
}
