"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

type FeatureLink = {
  href: string;
  labelKey:
    | "nav.aiInfluencer"
    | "nav.productPromo"
    | "nav.rightTool"
    | "nav.talkingHead"
    | "nav.cantonese"
    | "nav.explainer";
  blurbKey:
    | "nav.featuresAiInfluencer"
    | "nav.featuresProductPromo"
    | "nav.featuresRightTool"
    | "nav.featuresTalkingHead"
    | "nav.featuresCantonese"
    | "nav.featuresExplainer";
};

const FEATURES: FeatureLink[] = [
  {
    href: "/ai-influencer",
    labelKey: "nav.aiInfluencer",
    blurbKey: "nav.featuresAiInfluencer",
  },
  {
    href: "/product-promo",
    labelKey: "nav.productPromo",
    blurbKey: "nav.featuresProductPromo",
  },
  {
    href: "/right-tool",
    labelKey: "nav.rightTool",
    blurbKey: "nav.featuresRightTool",
  },
  {
    href: "/talking-head",
    labelKey: "nav.talkingHead",
    blurbKey: "nav.featuresTalkingHead",
  },
  {
    href: "/cantonese",
    labelKey: "nav.cantonese",
    blurbKey: "nav.featuresCantonese",
  },
  {
    href: "/explainer",
    labelKey: "nav.explainer",
    blurbKey: "nav.featuresExplainer",
  },
];

// Marketing feature pages — hover/focus submenu (tap toggles on touch).
export function SiteFeaturesMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const pointerType = useRef("");

  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function closeSoon() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={closeSoon}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node)) closeSoon();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onClick={() => {
          // Touch / click: toggle. Mouse hover already opens.
          if (pointerType.current === "mouse") return;
          setOpen((v) => !v);
        }}
        className="inline-flex shrink-0 items-center gap-1 font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
      >
        {t("nav.features")}
        <Chevron open={open} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white py-2 shadow-[0_12px_40px_rgba(18,20,28,0.12)] sm:w-80"
        >
          {FEATURES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 transition-colors hover:bg-[#f4fcd4]"
            >
              <span className="block text-sm font-semibold text-[#12141c]">{t(item.labelKey)}</span>
              <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{t(item.blurbKey)}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
