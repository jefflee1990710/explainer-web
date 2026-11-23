"use client";

// Dark canvas dropdown whose options show a preview image or colour chip next to the label.
// The menu is portaled so the node card and the zoomed canvas cannot clip or scale it.

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { DirectorBackgroundSwatch } from "@/presentation/components/app/projects/new/director-background-swatch";

export type CanvasPreviewOption = {
  value: string;
  label: string;
  sublabel?: string;
  previewUrl?: string;
  // Solid colour chip instead of an image (papercraft cardstock).
  swatch?: string;
  // "contain" keeps the whole preview visible (text style samples).
  previewFit?: "cover" | "contain";
};

const MENU_MIN_WIDTH = 300;

function Preview({ option, large }: { option: CanvasPreviewOption | undefined; large?: boolean }) {
  const size = large ? "h-12 w-[72px]" : "h-7 w-11";
  const frame = `${size} shrink-0 overflow-hidden rounded-md border border-white/10 bg-black`;
  if (option?.swatch) return <DirectorBackgroundSwatch color={option.swatch} className={`block ${frame}`} />;
  if (!option?.previewUrl) return <span className={frame} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={option.previewUrl}
      alt=""
      loading="lazy"
      className={`${frame} ${option.previewFit === "contain" ? "object-contain" : "object-cover"}`}
    />
  );
}

export function CanvasPreviewSelect({
  value,
  options,
  ariaLabel,
  disabled,
  onChange,
}: {
  value: string;
  options: readonly CanvasPreviewOption[];
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    // Opens below the trigger, or above it when there is more room there.
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, MENU_MIN_WIDTH);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const maxHeight = Math.min(420, Math.max(below, above));
      const top = below >= Math.min(420, above) ? rect.bottom + 6 : rect.top - 6 - maxHeight;
      setBox({ top: Math.max(8, top), left, width, maxHeight });
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    place();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="nodrag flex w-full cursor-pointer items-center gap-2 rounded-[8px] border border-white/10 bg-[#0b0e14] px-1.5 py-1.5 text-left text-[12px] text-white/90 hover:border-white/20 focus:border-[#c6f24b]/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Preview option={selected} />
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? value}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/45 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && box
        ? createPortal(
            <ul
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
              className="nowheel fixed z-[1000] overflow-y-auto rounded-[12px] border border-white/10 bg-[#12161f] p-1 text-white shadow-[0_18px_42px_rgba(0,0,0,0.55)]"
            >
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-2 py-1.5 text-left transition ${
                        active ? "bg-[#c6f24b]/15" : "hover:bg-white/6"
                      }`}
                    >
                      <Preview option={option} large />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold">{option.label}</span>
                        {option.sublabel ? (
                          <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-white/50">
                            {option.sublabel}
                          </span>
                        ) : null}
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-[#c6f24b]" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
}
