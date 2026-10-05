"use client";

import { useEffect, useRef, useState } from "react";
import { getCreditSnapshotAction } from "@/presentation/actions/billing";
import { CREDITS_CHANGED_EVENT } from "@/presentation/components/app/billing/credits-changed";

const POLL_MS = 5_000;

// Live remaining balance for the rail ring. Refreshes on spend and on a short poll.
export function useCreditSnapshot(initialCredits: number, initialLimit: number) {
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

  return { credits, creditLimit };
}
