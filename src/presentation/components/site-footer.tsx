"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Site-wide links to pricing, examples, and the legal documents.
export function SiteFooter({ showAffiliate = false }: { showAffiliate?: boolean }) {
  const { t } = useI18n();

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-zinc-500">{t("legal.rights")}</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-zinc-600">
          <Link href="/examples" className="hover:text-[#12141c]">
            {t("nav.examples")}
          </Link>
          {showAffiliate ? (
            <Link href="/affiliate" className="hover:text-[#12141c]">
              {t("nav.affiliate")}
            </Link>
          ) : null}
          <Link href="/pricing" className="hover:text-[#12141c]">
            {t("nav.pricing")}
          </Link>
          <Link href="/terms" className="hover:text-[#12141c]">
            {t("legal.terms")}
          </Link>
          <Link href="/privacy" className="hover:text-[#12141c]">
            {t("legal.privacy")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
