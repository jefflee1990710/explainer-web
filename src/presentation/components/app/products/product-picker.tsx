"use client";

import Link from "next/link";
import { PRODUCT_MAX } from "@/model/product-constants";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicProduct } from "@/presentation/serialize";

// Ready products only. Style is never chosen here.
export function ProductPicker({
  products,
  value,
  onChange,
  disabled,
  max = PRODUCT_MAX,
}: {
  products: PublicProduct[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const { t } = useI18n();
  const ready = products.filter((product) => product.blueprintUrl && !product.pending && !product.failed);
  if (ready.length === 0) {
    return (
      <p className="text-sm text-muted">
        {t("products.pickerEmpty")}{" "}
        <Link href="/app/products" className="font-semibold underline underline-offset-4">
          {t("products.pickerCreate")}
        </Link>
      </p>
    );
  }

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    if (value.length >= max) onChange([...value.slice(1), id]);
    else onChange([...value, id]);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("products.pickerTitle")}>
      {ready.map((product) => {
        const selected = value.includes(product.id);
        return (
          <button
            key={product.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => toggle(product.id)}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-2 pr-3 text-sm font-medium ${
              selected ? "border-[var(--studio-ink)] bg-[var(--studio-cyan-soft)]" : "border-[var(--studio-line)]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.blueprintUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            <span className="max-w-32 truncate">{product.name}</span>
          </button>
        );
      })}
    </div>
  );
}
