"use client";

import { useEffect, useRef, useState } from "react";
import { getCreditSnapshotAction } from "@/presentation/actions/billing";
import { CREDITS_CHANGED_EVENT } from "@/presentation/components/app/billing/credits-changed";

const POLL_MS = 5_000;

// Live remaining USD Credit balance for the rail ring. Refreshes on spend and on a short poll.
export function useCreditSnapshot(initialCreditUsd: number, initialLimitUsd: number) {
  const [live, setLive] = useState<{
    baseCredit: number;
    baseLimit: number;
    creditUsd: number;
    creditLimitUsd: number;
  } | null>(null);
  const inFlight = useRef(false);
  const latestInitialRef = useRef({ initialCreditUsd, initialLimitUsd });

  useEffect(() => {
    latestInitialRef.current = { initialCreditUsd, initialLimitUsd };
  }, [initialCreditUsd, initialLimitUsd]);

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await getCreditSnapshotAction();
        if (!alive || !result.ok) return;
        const base = latestInitialRef.current;
        setLive({
          baseCredit: base.initialCreditUsd,
          baseLimit: base.initialLimitUsd,
          creditUsd: result.creditUsd,
          creditLimitUsd: result.creditLimitUsd,
        });
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

  if (
    live &&
    live.baseCredit === initialCreditUsd &&
    live.baseLimit === initialLimitUsd
  ) {
    return { creditUsd: live.creditUsd, creditLimitUsd: live.creditLimitUsd };
  }
  return { creditUsd: initialCreditUsd, creditLimitUsd: initialLimitUsd };
}
