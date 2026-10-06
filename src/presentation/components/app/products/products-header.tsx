"use client";

import { CreateProductButton } from "@/presentation/components/app/products/create-product-modal";
import { useI18n } from "@/presentation/components/i18n-provider";

export function ProductsHeader({
  count,
  limit,
}: {
  count: number;
  // null means this account has no product cap.
  limit: number | null;
}) {
  const { t } = useI18n();
  const atLimit = limit != null && count >= limit;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("products.title")}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{t("products.subtitle")}</p>
        {limit != null ? (
          <p className="mt-1 text-xs text-muted">
            {atLimit
              ? limit <= 1
                ? t("products.needSubscribe")
                : t("products.atLimit", { limit })
              : t("products.usage", { used: count, limit })}
          </p>
        ) : null}
      </div>
      <CreateProductButton atLimit={atLimit} />
    </div>
  );
}
