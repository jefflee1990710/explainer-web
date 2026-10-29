"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  TALKING_HEAD_POSES,
  localizedTalkingHeadPose,
  resolveTalkingHeadPose,
  type TalkingHeadPoseId,
} from "@/model/talking-head-options";
import { useI18n } from "@/presentation/components/i18n-provider";

// Talking-head only: dropdown of framing zooms (full body → collarbone close-up) with Gemini previews.
export function TalkingHeadPoseField({
  value,
  onChange,
  disabled,
}: {
  value: TalkingHeadPoseId;
  onChange: (id: TalkingHeadPoseId) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = resolveTalkingHeadPose(value);
  const selectedCopy = localizedTalkingHeadPose(selected, locale);

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

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold">{t("brief.talkingHeadPose.title")}</p>
      <p className="mt-1 text-xs text-muted">{t("brief.talkingHeadPose.hint")}</p>

      <div ref={rootRef} className={`relative mt-3 ${open ? "z-30" : ""}`}>
        <button
          type="button"
          id={`${listboxId}-trigger`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={t("brief.talkingHeadPose.aria")}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PoseThumb src={selected.previewUrl} alt={selectedCopy.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {selectedCopy.name}
            </span>
            <span className="mt-0.5 block line-clamp-2 text-xs text-muted">
              {selectedCopy.description}
            </span>
          </span>
          <ChevronIcon open={open} />
        </button>

        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t("brief.talkingHeadPose.aria")}
            className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-accent-ink/15 bg-paper p-1 shadow-[4px_4px_0_0_rgba(18,20,28,0.08)]"
          >
            {TALKING_HEAD_POSES.map((pose) => {
              const copy = localizedTalkingHeadPose(pose, locale);
              const active = pose.id === selected.id;
              return (
                <li key={pose.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(pose.id);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      active ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                    }`}
                  >
                    <PoseThumb src={pose.previewUrl} alt={copy.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{copy.name}</span>
                      <span
                        className={`mt-0.5 block line-clamp-2 text-xs ${
                          active ? "text-paper/75" : "text-muted"
                        }`}
                      >
                        {copy.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function PoseThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative block h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--studio-fill)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
