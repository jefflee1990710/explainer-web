"use client";

import { useEffect, useId, useState } from "react";
import { startPackCheckoutAction } from "@/presentation/actions/billing";
import { CREDIT_PACKS } from "@/service/billing/packs";
import { Spinner } from "@/presentation/components/spinner";
import type { PackId } from "@/model/billing-settings";

const DEFAULT_PACK: PackId = "pack90";

// Progress-bar trigger that opens the add-credit dialog.
export function AddCreditButton({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={disabled ? "訂閱方案後才能加購" : undefined}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        加購 credits
      </button>
      {open ? <AddCreditModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Pack picker; submitting hands off to Stripe one-time checkout.
export function AddCreditModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [packId, setPackId] = useState<PackId>(DEFAULT_PACK);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const packs = Object.values(CREDIT_PACKS);

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
    const result = await startPackCheckoutAction(packId);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          加購 credits
        </h2>
        <p className="mt-2 text-sm text-muted">
          與每月重置分開計算。一次付清，未用完的加購會留到下個週期。
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <fieldset disabled={submitting} className="space-y-2">
            <legend className="mb-1.5 text-sm font-semibold">選擇加購包</legend>
            {packs.map((pack) => (
              <label
                key={pack.id}
                className={`flex cursor-pointer items-center gap-3 rounded-[1.25rem] border px-4 py-3 transition ${
                  packId === pack.id
                    ? "border-accent-ink bg-lime/40"
                    : "border-accent-ink/15 bg-paper hover:border-accent-ink/30"
                }`}
              >
                <input
                  type="radio"
                  name="packId"
                  value={pack.id}
                  checked={packId === pack.id}
                  onChange={() => setPackId(pack.id)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">
                    {pack.nameZh} · {pack.credits} credits
                  </span>
                  <span className="block text-xs text-muted">
                    約 {Math.floor(pack.credits / 3)} 段 clips
                  </span>
                </span>
                <span className="font-display text-lg font-bold">
                  ${pack.amountUsd}
                </span>
              </label>
            ))}
          </fieldset>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : null}
              前往付款
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
