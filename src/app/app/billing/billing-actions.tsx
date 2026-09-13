"use client";

import { useState } from "react";
import { startCheckoutAction, startPortalAction } from "@/lib/actions/billing";
import type { PlanId } from "@/types/subscription";

export function CheckoutButton({
  planId,
  label,
}: {
  planId: PlanId;
  label: string;
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
        className="rounded-full bg-accent px-4 py-2 text-sm text-white disabled:opacity-60"
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
        className="rounded-full border border-line px-4 py-2 text-sm"
      >
        管理訂閱
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
