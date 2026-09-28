"use client";

import { useEffect, useRef, useState } from "react";
import { getCreditSnapshotAction } from "@/presentation/actions/billing";
import { creditsUsed } from "@/service/billing/credit-balance";

const POLL_MS = 5_000;

// Compact header meter. The track fills with credits already spent this period.
export function CreditMeter({
  credits: initialCredits,
  creditLimit: initialLimit,
  creditsLabel,
  className = "min-w-28 max-sm:hidden",
}: {
  credits: number;
  creditLimit: number;
  creditsLabel: string;
  // Layout/visibility overrides for where the meter is placed.
  className?: string;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const [creditLimit, setCreditLimit] = useState(initialLimit);
  const inFlight = useRef(false);

  useEffect(() => {
    setCredits(initialCredits);
    setCreditLimit(initialLimit);
  }, [initialCredits, initialLimit]);

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await getCreditSnapshotAction();
        if (!alive || !result.ok) return;
        setCredits(result.credits);
        setCreditLimit(result.creditLimit);
      } finally {
        inFlight.current = false;
      }
    }
    void tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const { used, limit, ratio } = creditsUsed(credits, creditLimit);
  const percent = Math.round(ratio * 100);
  const hot = ratio >= 0.8;

  return (
    <div
      className={`flex flex-col gap-1 rounded-md border border-[var(--studio-line)] bg-[var(--studio-panel)] px-2.5 py-1 ${className}`}
    >
      <span className="whitespace-nowrap text-xs font-semibold tabular-nums">
        {credits} {creditsLabel}
      </span>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--studio-line)]"
        role="progressbar"
        aria-label={creditsLabel}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        title={`${used} / ${limit}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${
            hot ? "bg-[var(--accent)]" : "bg-[var(--studio-teal)]"
          }`}
          style={{ width: used === 0 ? "0%" : `max(${percent}%, 6px)` }}
        />
      </div>
    </div>
  );
}
