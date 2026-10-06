"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicProduct } from "@/presentation/serialize";

// Library card. The sheet is the realistic blueprint, not a styled drawing.
export function ProductCard({ product }: { product: PublicProduct }) {
  const { t } = useI18n();
  return (
    <article
      className={`studio-card flex flex-col overflow-hidden border ${
        product.failed ? "border-[#f04444]" : "border-[var(--studio-line)]"
      }`}
    >
      <Link href={`/app/products/${product.id}`} className="relative block aspect-square bg-white">
        {product.blueprintUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.blueprintUrl}
            alt={t("products.blueprintAlt", { name: product.name })}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted">{t("products.realistic")}</div>
        )}
        {product.pending ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold">
            <Spinner className="h-3 w-3" />
            {t("products.cardGenerating")}
          </span>
        ) : product.failed ? (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            {t("products.cardFailed")}
          </span>
        ) : null}
      </Link>
      <div className="px-3 py-2.5">
        <Link href={`/app/products/${product.id}`}>
          <h3 className="line-clamp-1 text-sm font-medium">{product.name}</h3>
        </Link>
        <p className="mt-1 text-xs text-muted">{t("products.realistic")}</p>
      </div>
    </article>
  );
}
