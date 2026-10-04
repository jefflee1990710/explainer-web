"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SLOT_ID = "video-edit-summary-end";

// Host on the brief summary row so the export button can sit on the far right.
export function VideoEditSummaryEndSlot() {
  return <div id={SLOT_ID} className="ml-auto shrink-0" />;
}

// Mount desk actions into the summary-row slot without lifting edit state.
export function VideoEditSummaryEnd({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.getElementById(SLOT_ID));
  }, []);
  if (!host) return null;
  return createPortal(children, host);
}
