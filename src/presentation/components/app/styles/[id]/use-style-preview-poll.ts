"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PreviewStatus } from "@/model/user-style";

const POLL_MS = 4000;

// Refresh the style desk while a preview job is in flight.
export function useStylePreviewPoll(previewStatus: PreviewStatus) {
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
