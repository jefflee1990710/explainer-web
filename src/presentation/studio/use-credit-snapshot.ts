"use client";

import { useEffect, useRef, useState } from "react";
import { getCreditSnapshotAction } from "@/presentation/actions/billing";
import {
  CREDITS_CHANGED_EVENT,
  type CreditsChangedDetail,
} from "@/presentation/components/app/billing/credits-changed";

const POLL_MS = 5_000;

// Validates a CustomEvent detail payload before optimistically applying it to wallet state.
function parseCreditsChangedDetail(event: Event): { creditUsd: number; creditLimitUsd: number } | null {
  const detail = (event as CustomEvent<Partial<CreditsChangedDetail> | undefined>).detail;
  if (
    !detail ||
    typeof detail.creditUsd !== "number" ||
    !Number.isFinite(detail.creditUsd) ||
    typeof detail.creditLimitUsd !== "number" ||
    !Number.isFinite(detail.creditLimitUsd)
  ) {
    return null;
  }
  return { creditUsd: detail.creditUsd, creditLimitUsd: detail.creditLimitUsd };
}

// Live remaining USD Credit balance for the rail ring. Refreshes on spend and on a short poll.
export function useCreditSnapshot(initialCreditUsd: number, initialLimitUsd: number) {
  const [live, setLive] = useState<{
    baseCredit: number;
    baseLimit: number;
    creditUsd: number;
    creditLimitUsd: number;
  } | null>(null);
  const latestInitialRef = useRef({ initialCreditUsd, initialLimitUsd });

  useEffect(() => {
    latestInitialRef.current = { initialCreditUsd, initialLimitUsd };
  }, [initialCreditUsd, initialLimitUsd]);

  useEffect(() => {
    let alive = true;
    let inFlight = false;
    let pendingRefresh = false;
    let epoch = 0;

    async function tick() {
      if (inFlight) {
        pendingRefresh = true;
        return;
      }
      inFlight = true;
      const requestEpoch = epoch;
      try {
        const result = await getCreditSnapshotAction();
        if (!alive || !result.ok || requestEpoch !== epoch) return;
        const base = latestInitialRef.current;
        setLive({
          baseCredit: base.initialCreditUsd,
          baseLimit: base.initialLimitUsd,
          creditUsd: result.creditUsd,
          creditLimitUsd: result.creditLimitUsd,
        });
      } finally {
        inFlight = false;
        if (alive && pendingRefresh) {
          pendingRefresh = false;
          void tick();
        }
      }
    }

    function onCreditsChanged(event: Event) {
      const detail = parseCreditsChangedDetail(event);
      if (detail) {
        epoch += 1;
        const base = latestInitialRef.current;
        setLive({
          baseCredit: base.initialCreditUsd,
          baseLimit: base.initialLimitUsd,
          creditUsd: detail.creditUsd,
          creditLimitUsd: detail.creditLimitUsd,
        });
      }
      if (inFlight) {
        pendingRefresh = true;
        return;
      }
      void tick();
    }

    void tick();
    const timer = window.setInterval(() => {
      if (!inFlight) void tick();
    }, POLL_MS);
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
