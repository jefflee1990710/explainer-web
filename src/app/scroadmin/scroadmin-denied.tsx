"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Shown when a signed-in account is not the hardcoded operator inbox.
export function ScroAdminDenied({ email }: { email: string }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0a0c10] px-6 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b]">
        {t("scroAdmin.title")}
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold">{t("scroAdmin.deniedTitle")}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-white/70">{t("scroAdmin.deniedBody")}</p>
      {email ? (
        <p className="mt-2 text-xs text-white/45">{email}</p>
      ) : null}
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[#c6f24b] px-6 py-2.5 text-sm font-semibold text-[#12141c]"
      >
        {t("nav.home")}
      </Link>
    </div>
  );
}
