"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { payPercent } from "@/service/billing/promo";

// Top strip for the current signup offer, or the rate already locked on this account.
export function SignupPromoBanner({
  variant,
  signedIn = false,
  discountPercent,
  credits,
  bonusPercent,
}: {
  variant: "public" | "locked";
  signedIn?: boolean;
  discountPercent: number;
  credits: number;
  bonusPercent: number;
}) {
  const { t } = useI18n();
  const pay = payPercent(discountPercent);
  const message =
    variant === "locked"
      ? t("signupPromo.locked", { pay, bonus: bonusPercent })
      : t("signupPromo.banner", { pay, credits, bonus: bonusPercent });

  return (
    <div className="bg-[#12141c] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2.5 text-center sm:px-6">
        <p className="text-sm leading-snug">
          <span className="mr-2 inline-flex rounded-full bg-[#c6f24b] px-2 py-0.5 text-[11px] font-bold text-[#12141c]">
            {t("signupPromo.badge")}
          </span>
          {message}
        </p>
        {variant === "public" ? (
          <Link
            href={signedIn ? "/pricing" : "/sign-up"}
            className="inline-flex shrink-0 rounded-full bg-[#c6f24b] px-3 py-1 text-xs font-semibold text-[#12141c] transition-colors hover:bg-[#d4f56e]"
          >
            {signedIn ? t("signupPromo.ctaPricing") : t("signupPromo.cta")}
          </Link>
        ) : (
          <Link
            href="/app/billing"
            className="inline-flex shrink-0 rounded-full bg-[#c6f24b] px-3 py-1 text-xs font-semibold text-[#12141c] transition-colors hover:bg-[#d4f56e]"
          >
            {t("signupPromo.ctaBilling")}
          </Link>
        )}
      </div>
    </div>
  );
}
