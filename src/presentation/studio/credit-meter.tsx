"use client";

import { useEffect, useRef, useState } from "react";
import { getCreditSnapshotAction } from "@/presentation/actions/billing";
import { CREDITS_CHANGED_EVENT } from "@/presentation/components/app/billing/credits-changed";
import { creditProgress } from "@/service/billing/credit-balance";

const POLL_MS = 5_000;

// Remaining-balance gauge. Number plus a fill track — not a queue chip.
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
    function onCreditsChanged() {
      void tick();
    }
    void tick();
    const timer = window.setInterval(tick, POLL_MS);
    window.addEventListener(CREDITS_CHANGED_EVENT, onCreditsChanged);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener(CREDITS_CHANGED_EVENT, onCreditsChanged);
    };
  }, []);

  const limit = Math.max(creditLimit, credits);
  const { remaining, ratio } = creditProgress(credits, limit);
  const percent = Math.round(ratio * 100);
  const low = limit > 0 && ratio <= 0.2;

  return (
    <div className={`flex flex-col gap-1.5 px-0.5 ${className}`}>
      <span className="flex items-center justify-center gap-1.5 whitespace-nowrap group-hover/rail:justify-start group-focus-within/rail:justify-start">
        <CreditIcon />
        <span className="hidden text-sm font-bold tabular-nums leading-none group-hover/rail:inline group-focus-within/rail:inline">
          {credits}
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-wide text-[var(--studio-muted)] group-hover/rail:inline group-focus-within/rail:inline">
          {creditsLabel}
        </span>
      </span>
      <div
        className="hidden h-1 overflow-hidden rounded-full bg-[var(--studio-fill)] group-hover/rail:block group-focus-within/rail:block"
        role="progressbar"
        aria-label={creditsLabel}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={remaining}
        title={`${remaining} / ${limit}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${
            low ? "bg-[var(--accent)]" : "bg-[var(--studio-teal)]"
          }`}
          style={{ width: remaining === 0 ? "0%" : `max(${percent}%, 6px)` }}
        />
      </div>
    </div>
  );
}

function CreditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[var(--studio-muted)]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}
