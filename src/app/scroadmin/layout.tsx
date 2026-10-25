import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthSession, upsertAppUserFromIdentity } from "@/service/auth";
import { isScroAdminEmail } from "@/service/academy/admin";
import { ScroAdminDenied } from "@/app/scroadmin/scroadmin-denied";
import { ScroAdminShell } from "@/app/scroadmin/scroadmin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scro Admin",
  robots: { index: false, follow: false },
};

// Operator-only CMS. Unsigned visitors sign in; any other inbox is refused.
export default async function ScroAdminLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();
  if (!session) redirect("/sign-in?next=/scroadmin");
  const user = await upsertAppUserFromIdentity({
    uid: session.uid,
    email: session.email,
    name: session.name,
  });
  if (!isScroAdminEmail(user.email)) {
    return <ScroAdminDenied email={user.email} />;
  }
  return <ScroAdminShell email={user.email}>{children}</ScroAdminShell>;
}
