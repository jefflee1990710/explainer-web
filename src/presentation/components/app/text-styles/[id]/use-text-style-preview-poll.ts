"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TextStylePreviewStatus } from "@/model/text-style";

const POLL_MS = 4000;

// Refresh the text-style desk while a sample job is in flight.
export function useTextStylePreviewPoll(previewStatus: TextStylePreviewStatus) {
  const router = useRouter();
  useEffect(() => {
    if (previewStatus !== "generating") return;
    let cancelled = false;
    function tick() {
      if (!cancelled) router.refresh();
    }
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [previewStatus, router]);
}
