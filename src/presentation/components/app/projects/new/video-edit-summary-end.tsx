"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SUMMARY_SLOT_ID = "video-edit-summary-end";
const HEADER_SLOT_ID = "video-editor-header-export";

// Host on the brief summary row so a desk action can sit on the far right.
export function VideoEditSummaryEndSlot() {
  return <div id={SUMMARY_SLOT_ID} className="ml-auto shrink-0" />;
}

// Host in the editor header, immediately after 重新開始.
export function VideoEditorHeaderExportSlot() {
  return <div id={HEADER_SLOT_ID} className="shrink-0" />;
}

// Mount desk actions into a slot without lifting edit state.
export function VideoEditSummaryEnd({ children }: { children: ReactNode }) {
  return <SlotPortal id={SUMMARY_SLOT_ID}>{children}</SlotPortal>;
}

// OpenCut export sits beside the restart button, not on the summary row.
export function VideoEditorHeaderExport({ children }: { children: ReactNode }) {
  return <SlotPortal id={HEADER_SLOT_ID}>{children}</SlotPortal>;
}

function SlotPortal({ id, children }: { id: string; children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // The header and summary row can mount after the desk, or be replaced. Follow the slot.
    const attach = () => {
      const slot = document.getElementById(id);
      setHost((current) => (slot === current ? current : slot));
    };
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = requestAnimationFrame(attach);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [id]);
  if (!host) return null;
  return createPortal(children, host);
}
