"use client";

// Dark canvas dropdown whose options show a preview image or colour chip next to the label.
// The menu is portaled so the node card and the zoomed canvas cannot clip or scale it.

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { CharacterPairFrame } from "@/presentation/components/app/characters/character-pair-menu";
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
  // Square is a face. Portrait is a 3:4 framing still. Body is a 9:16 standing figure.
  previewShape?: "wide" | "square" | "portrait" | "body";
  // Portraits keep the face in frame when the source is a full-body still.
  previewAnchor?: "center" | "top";
  // Zoom a full-body still so the menu shows the face, not the whole figure.
  previewCrop?: "face";
  // Second still beside the first. Character rows use this for the standing figure.
  secondaryPreviewUrl?: string;
  secondaryShape?: "wide" | "square" | "portrait" | "body";
  secondaryFit?: "cover" | "contain";
};

const MENU_MIN_WIDTH = 300;

function hasPreview(option: CanvasPreviewOption | undefined): boolean {
  return Boolean(option?.previewUrl || option?.secondaryPreviewUrl || option?.swatch);
}

function frameSize(shape: CanvasPreviewOption["previewShape"], large?: boolean) {
  if (shape === "body") return large ? "h-28 w-16" : "h-10 w-6";
  if (shape === "portrait") return large ? "h-24 w-[72px]" : "h-10 w-8";
  if (shape === "square") return large ? "h-16 w-16" : "h-8 w-8";
  return large ? "h-12 w-[72px]" : "h-7 w-11";
}

function PreviewImage({
  src,
  shape,
  fit,
  anchor,
  crop,
  large,
}: {
  src: string;
  shape: CanvasPreviewOption["previewShape"];
  fit?: CanvasPreviewOption["previewFit"];
  anchor?: CanvasPreviewOption["previewAnchor"];
  crop?: CanvasPreviewOption["previewCrop"];
  large?: boolean;
}) {
  const frame = `${frameSize(shape, large)} shrink-0 overflow-hidden rounded-md border border-white/10 bg-black`;
  if (crop === "face") {
    return (
      <span className={`${frame} relative`}>
        {/* Standing library stills are full-body. Zoom toward the upper centre so the face fills the tile. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" className="absolute left-1/2 top-0 w-[240%] max-w-none -translate-x-1/2" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`${frame} ${fit === "contain" ? "object-contain" : "object-cover"} ${
        anchor === "top" ? "object-top" : "object-center"
      }`}
    />
  );
}

function Preview({ option, large }: { option: CanvasPreviewOption | undefined; large?: boolean }) {
  if (option?.swatch) {
    const frame = `${frameSize(option.previewShape, large)} shrink-0 overflow-hidden rounded-md border border-white/10 bg-black`;
    return <DirectorBackgroundSwatch color={option.swatch} className={`block ${frame}`} />;
  }
  if (!option?.previewUrl && !option?.secondaryPreviewUrl) return null;
  // Face and standing figure share one frame so the row reads as a single still.
  if (option.previewUrl && option.secondaryPreviewUrl) {
    return (
      <CharacterPairFrame portraitUrl={option.previewUrl} fullBodyUrl={option.secondaryPreviewUrl} large={large} />
    );
  }
  return (
    <PreviewImage
      src={option.previewUrl ?? option.secondaryPreviewUrl ?? ""}
      shape={option.previewUrl ? option.previewShape : (option.secondaryShape ?? "portrait")}
      fit={option.previewUrl ? option.previewFit : (option.secondaryFit ?? "contain")}
      anchor={option.previewAnchor}
      crop={option.previewCrop}
      large={large}
    />
  );
}

export function CanvasPreviewSelect({
  value,
  options,
  ariaLabel,
  disabled,
  layout = "inline",
  onChange,
}: {
  value: string;
  options: readonly CanvasPreviewOption[];
  ariaLabel: string;
  disabled?: boolean;
  // "banner" shows a wide preview on the left of the closed control and of each option.
  layout?: "inline" | "banner";
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
    // React Flow pans by transforming the viewport, so scroll events never fire.
    // Keep the menu on the trigger while the canvas moves.
    let frame = 0;
    let last = "";
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, MENU_MIN_WIDTH);
      const left = Math.round(Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)));
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const maxHeight = Math.round(Math.min(420, Math.max(below, above)));
      const top = Math.round(Math.max(8, below >= Math.min(420, above) ? rect.bottom + 6 : rect.top - 6 - maxHeight));
      const key = `${top}|${left}|${Math.round(width)}|${maxHeight}`;
      if (key === last) return;
      last = key;
      setBox({ top, left, width, maxHeight });
    }
    function tick() {
      place();
      frame = window.requestAnimationFrame(tick);
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
    frame = window.requestAnimationFrame(tick);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
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
        {layout === "banner" && selected?.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.previewUrl} alt="" className="h-14 w-24 shrink-0 rounded-[6px] object-cover" />
        ) : hasPreview(selected) ? (
          <Preview option={selected} />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{selected?.label ?? value}</span>
          {layout === "banner" && selected?.sublabel ? (
            <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-white/50">{selected.sublabel}</span>
          ) : null}
        </span>
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
                      {layout === "banner" && option.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={option.previewUrl}
                          alt=""
                          className="h-14 w-24 shrink-0 rounded-[6px] object-cover"
                        />
                      ) : hasPreview(option) ? (
                        <Preview option={option} large />
                      ) : null}
                      <span className="flex min-w-0 w-full items-center gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold">{option.label}</span>
                        {option.sublabel ? (
                          <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-white/50">
                            {option.sublabel}
                          </span>
                        ) : null}
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-[#c6f24b]" /> : null}
                      </span>
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
