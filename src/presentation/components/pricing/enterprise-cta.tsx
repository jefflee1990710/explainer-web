"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { ENTERPRISE, salesMailto } from "@/service/billing/plans";

// Shared enterprise CTA used on landing and billing.
export function EnterpriseCta({
  className = "",
  compact = false,
  imageSrc,
}: {
  className?: string;
  compact?: boolean;
  imageSrc?: string;
}) {
  const { t } = useI18n();
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 ${className}`}
    >
      {imageSrc ? (
        <div className="-mx-8 -mt-8 mb-6 h-44 overflow-hidden rounded-t-2xl bg-white">
          <img src={imageSrc} alt="" className="h-full w-full object-cover object-center" />
        </div>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {t("landing.enterprise.cardLabel")}
      </p>
      <h3 className="font-display mt-2 text-2xl font-bold">
        {t("landing.enterprise.nameLine", { name: ENTERPRISE.name, nameLocal: ENTERPRISE.nameZh })}
      </h3>
      <p className="mt-3 font-display text-3xl font-bold">{t("landing.enterprise.quote")}</p>
      <p className="mt-3 flex-1 text-sm leading-6 text-muted">{t("landing.enterprise.body")}</p>
      <a
        href={salesMailto()}
        className={`mt-7 inline-flex min-h-[44px] w-fit items-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 ${
          compact ? "py-2" : "py-2.5"
        }`}
      >
        {t("landing.enterprise.cta")}
      </a>
    </article>
  );
}
