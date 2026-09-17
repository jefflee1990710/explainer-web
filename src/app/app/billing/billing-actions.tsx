"use client";

import { useState } from "react";
import { startCheckoutAction, startPackCheckoutAction, startPortalAction } from "@/lib/actions/billing";
import type { PackId } from "@/types/billing-settings";
import type { PlanId } from "@/types/subscription";

export function CheckoutButton({
  planId,
  label,
  variant = "accent",
}: {
  planId: PlanId;
  label: string;
  variant?: "accent" | "lime";
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError("");
    const result = await startCheckoutAction(planId);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
          variant === "lime"
            ? "bg-lime text-accent-ink shadow-[3px_3px_0_0_rgba(255,77,46,0.9)]"
            : "bg-accent text-white shadow-[3px_3px_0_0_#12141c]"
        }`}
      >
        {pending ? "前往付款…" : label}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function PortalButton() {
  const [error, setError] = useState("");

  async function onClick() {
    const result = await startPortalAction();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void onClick()}
        className="rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_0_rgba(198,242,75,0.7)]"
      >
        管理訂閱
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function BuyPackButton({
  packId,
  label,
}: {
  packId: PackId;
  label: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError("");
    const result = await startPackCheckoutAction(packId);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] disabled:opacity-60"
      >
        {pending ? "前往付款…" : label}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
