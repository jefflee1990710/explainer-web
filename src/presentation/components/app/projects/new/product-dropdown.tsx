"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { PRODUCT_MAX } from "@/model/product-constants";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicProduct } from "@/presentation/serialize";

// Optional products on the create-video form. Same menu as the character picker.
export function ProductDropdown({
  products,
  value,
  onChange,
  disabled,
  max = PRODUCT_MAX,
}: {
  products: PublicProduct[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const { t } = useI18n();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const ready = products.filter((product) => product.blueprintUrl && !product.pending && !product.failed);
  const selected = ready.filter((product) => value.includes(product.id));

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

  if (ready.length === 0) {
    return (
      <p className="text-sm text-muted">
        {t("products.pickerEmpty")}{" "}
        <Link href="/app/products" className="font-semibold underline underline-offset-4">
          {t("products.pickerCreate")}
        </Link>
      </p>
    );
  }

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, id]);
  }

  const summary =
    selected.length === 0
      ? t("products.pickerNone")
      : selected.map((product) => product.name).join(", ");

  return (
    <div>
      <div ref={rootRef} className={`relative ${open ? "z-30" : ""}`}>
        <button
          type="button"
          id={`${listboxId}-trigger`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {selected[0]?.blueprintUrl ? <Thumb src={selected[0].blueprintUrl} /> : <EmptyThumb />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{summary}</span>
            {selected.length > 1 ? (
              <span className="mt-0.5 block text-xs text-muted">
                {t("products.pickerSelected", { n: selected.length })}
              </span>
            ) : null}
          </span>
          <ChevronIcon open={open} />
        </button>

        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t("products.pickerTitle")}
            aria-multiselectable="true"
            className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-accent-ink/15 bg-paper p-1 shadow-[4px_4px_0_0_rgba(18,20,28,0.08)]"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={selected.length === 0}
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  selected.length === 0 ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                }`}
              >
                <EmptyThumb />
                {t("products.pickerNone")}
              </button>
            </li>
            {ready.map((product) => {
              const active = value.includes(product.id);
              const full = !active && value.length >= max;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={disabled || full}
                    onClick={() => toggle(product.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${
                      active ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                    }`}
                  >
                    {product.blueprintUrl ? <Thumb src={product.blueprintUrl} /> : <EmptyThumb />}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted">
        <Link href="/app/products" className="underline underline-offset-4">
          {t("products.pickerManage")}
        </Link>
      </p>
    </div>
  );
}

function Thumb({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={96}
      height={64}
      className="h-14 w-24 shrink-0 rounded-md border border-accent-ink/10 bg-white object-contain object-center"
    />
  );
}

function EmptyThumb() {
  return (
    <span className="grid h-14 w-24 shrink-0 place-items-center rounded-md border border-dashed border-accent-ink/15 text-xs text-muted">
      —
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
