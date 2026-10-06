"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { ProductReferences } from "@/presentation/components/app/products/product-references";
import { createProductAction } from "@/presentation/actions/products";
import { useI18n } from "@/presentation/components/i18n-provider";
import { PRODUCT_DESCRIPTION_MAX, PRODUCT_NAME_MAX } from "@/model/product-constants";

// Name, notes, and photos. The blueprint is always realistic.
export function CreateProductButton({
  atLimit = false,
  className,
  children,
}: {
  atLimit?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={
          className ??
          "inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--studio-ink)] px-5 text-sm font-semibold text-[var(--studio-teal)] disabled:cursor-not-allowed disabled:opacity-50"
        }
        disabled={atLimit}
        onClick={() => setOpen(true)}
      >
        {children ?? t("products.create")}
      </button>
      {open ? <CreateProductModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function CreateProductModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const data = new FormData();
    data.set("name", name);
    data.set("description", description);
    for (const url of urls) data.append("referenceImageUrl", url);
    const result = await createProductAction(data);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.push(`/app/products/${result.id}`);
    router.refresh();
  }

  return (
    <DialogBackdrop className="grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void onSubmit(event)}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-2xl font-bold">
            {t("products.create")}
          </h2>
          <button type="button" className="min-h-11 cursor-pointer px-2 text-sm font-semibold" onClick={onClose}>
            {t("products.close")}
          </button>
        </div>
        <label className="mt-5 block text-sm font-semibold">
          {t("products.name")}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={PRODUCT_NAME_MAX}
            required
            placeholder={t("products.namePlaceholder")}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--studio-line)] px-3 text-base font-normal"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("products.description")}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={PRODUCT_DESCRIPTION_MAX}
            rows={3}
            placeholder={t("products.descriptionPlaceholder")}
            className="mt-2 w-full rounded-xl border border-[var(--studio-line)] px-3 py-3 text-base font-normal"
          />
        </label>
        <div className="mt-4">
          <ProductReferences urls={urls} disabled={submitting} onChange={setUrls} onError={setError} />
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--studio-ink)] px-5 text-sm font-semibold text-[var(--studio-teal)] disabled:opacity-50"
        >
          {submitting ? t("products.submitting") : t("products.submit")}
        </button>
      </form>
    </DialogBackdrop>
  );
}
