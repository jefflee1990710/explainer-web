import type { ReactNode } from "react";
import { SiteFooter } from "@/presentation/components/site-footer";
import { SiteHeader } from "@/presentation/components/site-header";
import { getAuthSession } from "@/service/auth";

// Public pages share the marketing header and footer.
export async function PolicyLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white text-zinc-900">
      <SiteHeader signedIn={Boolean(session)} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
