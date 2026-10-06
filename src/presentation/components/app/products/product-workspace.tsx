"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteProductAction, retryProductAction } from "@/presentation/actions/products";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicProduct } from "@/presentation/serialize";

// One product: photos, realistic sheet, retry, and delete.
export function ProductWorkspace({ product }: { product: PublicProduct }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!product.pending) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [product.pending, router]);

  async function retry() {
    setBusy(true);
    setError("");
    const result = await retryProductAction(product.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const result = await deleteProductAction(product.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/app/products");
    router.refresh();
  }

  const status = product.pending
    ? t("products.statusQueued")
    : product.failed
      ? t("products.statusFailed")
      : t("products.statusReady");

  return (
    <div>
      <Link href="/app/products" className="text-sm font-semibold text-muted">
        {t("products.back")}
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">{status}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || product.pending}
            onClick={() => void retry()}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--studio-line)] px-4 text-sm font-semibold disabled:opacity-50"
          >
            {t("products.retry")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-red-700"
          >
            {t("products.delete")}
          </button>
        </div>
      </div>
      {product.description ? <p className="mt-3 max-w-xl text-sm">{product.description}</p> : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid min-h-80 place-items-center rounded-3xl border border-[var(--studio-line)] bg-white">
          {product.blueprintUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.blueprintUrl}
              alt={t("products.blueprintAlt", { name: product.name })}
              className="max-h-[70vh] w-full object-contain"
            />
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              {product.pending ? <Spinner className="h-4 w-4" /> : null}
              {status}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">{t("products.photos")}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {product.referenceImageUrls.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={t("products.photoAlt", { n: index + 1 })} className="aspect-square rounded-xl object-cover" />
            ))}
          </div>
        </div>
      </div>
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl bg-white p-6">
            <h2 className="font-display text-xl font-bold">{t("products.deleteTitle")}</h2>
            <p className="mt-2 text-sm text-muted">{t("products.deleteBody")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="min-h-11 cursor-pointer px-4 text-sm font-semibold" onClick={() => setConfirmDelete(false)}>
                {t("products.close")}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-red-700 px-4 text-sm font-semibold text-white"
                onClick={() => void remove()}
              >
                {t("products.delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
