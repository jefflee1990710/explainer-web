"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

// Right-side Recent drawer for Life. Closed by default; opens from the header button.
export function LifeRecentDrawer({
  open,
  onOpenChange,
  title,
  badge,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const panelId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open && !wasOpen.current) closeRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label={t("common.close")}
        className={`fixed inset-0 z-40 touch-manipulation bg-accent-ink/45 ${
          open ? "" : "pointer-events-none opacity-0"
        } motion-safe:transition-opacity motion-safe:duration-200 motion-reduce:transition-none`}
        onClick={() => onOpenChange(false)}
      />
      <aside
        id={panelId}
        aria-label={t("life.recent")}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(calc(100vw-2.5rem),28rem)] flex-col border-l border-accent-ink/10 bg-paper pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[-8px_0_24px_rgba(18,20,28,0.08)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <DrawerChrome
          title={title}
          badge={badge}
          closeRef={closeRef}
          onClose={() => onOpenChange(false)}
        >
          {children}
        </DrawerChrome>
      </aside>
    </>
  );
}

function DrawerChrome({
  title,
  badge,
  children,
  closeRef,
  onClose,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3.5">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="min-w-0 truncate font-display text-sm font-bold">{title}</h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {badge}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-accent-ink transition hover:bg-accent-ink/[0.06]"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{children}</div>
    </div>
  );
}

// Compact header control that opens the Recent drawer.
export function LifeRecentOpenButton({
  count,
  generatingCount,
  onClick,
}: {
  count: number;
  generatingCount: number;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/15 bg-paper px-3 text-[11px] font-bold text-foreground transition hover:border-accent-ink"
    >
      {t("life.recent")}
      {generatingCount > 0 ? (
        <span className="rounded-full bg-accent-ink px-1.5 py-0.5 text-[10px] font-bold text-lime">
          {generatingCount}
        </span>
      ) : count > 0 ? (
        <span className="rounded-full bg-accent-ink/8 px-1.5 py-0.5 text-[10px] font-bold text-muted">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
