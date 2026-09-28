"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type Toast = {
  id: number;
  tone: "success" | "error";
  title: string;
  // Optional finished image / video to preview inline.
  media?: { kind: "image" | "video"; url: string };
};

// How long a toast stays before it slides away on its own.
const TOAST_MS = 6000;

// Local toast state: `push` adds one, it dismisses itself after TOAST_MS.
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);
  return { toasts, push, dismiss };
}

// Bottom-right notification stack shared by every page; pair with useToasts.
export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  // Auto-dismiss timer lives with the card so a re-render never resets it.
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const edge = toast.tone === "success" ? "border-l-[var(--studio-teal)]" : "border-l-accent";
  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex items-center gap-3 rounded-2xl border border-accent-ink/10 border-l-4 bg-paper p-3 shadow-[6px_6px_0_0_rgba(18,20,28,0.12)] ${edge}`}
    >
      {toast.media?.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={toast.media.url}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      )}
      {toast.media?.kind === "video" && (
        <video
          src={toast.media.url}
          muted
          playsInline
          preload="metadata"
          className="h-12 w-12 shrink-0 rounded-lg bg-black object-cover"
        />
      )}
      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
        {toast.title}
      </p>
      <button
        type="button"
        aria-label="關閉通知"
        onClick={() => onDismiss(toast.id)}
        className="cursor-pointer text-lg leading-none text-muted transition hover:text-foreground"
      >
        ×
      </button>
    </motion.div>
  );
}
