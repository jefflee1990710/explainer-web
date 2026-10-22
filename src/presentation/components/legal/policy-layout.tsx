import type { ReactNode } from "react";
import { usersCollection } from "@/dao";
import { SiteFooter } from "@/presentation/components/site-footer";
import { SiteHeader } from "@/presentation/components/site-header";
import { isAffiliateAccount } from "@/service/affiliate/enabled";
import { getAuthSession } from "@/service/auth";
import {
  adhocBonusPercent,
  signupDiscountPercent,
  signupPromoEnabled,
} from "@/service/billing/promo";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";

// Public pages share the marketing header and footer.
export async function PolicyLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();
  let showAffiliate = false;
  if (session) {
    const users = await usersCollection();
    const user = await users.findOne({ clerkUserId: session.uid });
    showAffiliate = isAffiliateAccount(user);
  }
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white text-zinc-900">
      <SiteHeader
        signedIn={Boolean(session)}
        showAffiliate={showAffiliate}
        showPromo={signupPromoEnabled()}
        promoDiscountPercent={signupDiscountPercent()}
        promoCredits={WELCOME_CREDITS}
        promoBonusPercent={adhocBonusPercent()}
        account={
          session
            ? {
                email: typeof session.email === "string" ? session.email : "",
                name: typeof session.name === "string" ? session.name : "",
                avatarUrl: typeof session.picture === "string" ? session.picture : undefined,
              }
            : undefined
        }
      />
      <div className="flex-1">{children}</div>
      <SiteFooter showAffiliate={showAffiliate} />
    </div>
  );
}
