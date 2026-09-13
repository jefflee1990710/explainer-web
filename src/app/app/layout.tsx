import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@/components/app-shell";
import { requireAppUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();
  const user = await requireAppUser();
  return <AppShell credits={user.credits}>{children}</AppShell>;
}
