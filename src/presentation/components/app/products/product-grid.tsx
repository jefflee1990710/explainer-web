"use client";

import { ProductCard } from "@/presentation/components/app/products/product-card";
import { CreateProductButton } from "@/presentation/components/app/products/create-product-modal";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicProduct } from "@/presentation/serialize";

export function ProductGrid({
  products,
  atLimit,
}: {
  products: PublicProduct[];
  atLimit: boolean;
}) {
  const { t } = useI18n();
  if (products.length === 0) {
    return (
      <div className="max-w-md">
        <h2 className="text-lg font-semibold">{t("products.emptyTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{t("products.emptyBody")}</p>
        <div className="mt-4">
          <CreateProductButton atLimit={atLimit} />
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
