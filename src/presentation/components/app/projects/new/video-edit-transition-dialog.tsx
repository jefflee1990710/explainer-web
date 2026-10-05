"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioButton } from "@/presentation/studio/studio-button";
import {
  EDIT_LIMITS,
  TRANSITION_EFFECTS,
  type EditTransition,
  type TransitionEffect,
} from "@/model/video-edit";

const EFFECT_KEY: Record<TransitionEffect, string> = {
  none: "none",
  fade: "fade",
  dissolve: "dissolve",
  wipeleft: "wipeLeft",
  wiperight: "wipeRight",
  slideleft: "slideLeft",
  slideright: "slideRight",
};

export function VideoEditTransitionDialog({
  fromLabel,
  toLabel,
  value,
  onSave,
  onClose,
}: {
  fromLabel: string;
  toLabel: string;
  value: EditTransition;
  onSave: (transition: EditTransition) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [draft, setDraft] = useState(value);
  const { min, max, default: fallback } = EDIT_LIMITS.transitionDurationSec;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <DialogBackdrop className="grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-[var(--studio-line)] bg-white p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-sm font-semibold">
          {t("video.transition.title")}
        </h2>
        <p className="mt-1 text-xs text-[var(--studio-muted)]">
          {t("video.transition.between", { from: fromLabel, to: toLabel })}
        </p>
        <label className="mt-4 block text-xs">
          <span className="font-semibold">{t("video.transition.effect")}</span>
          <select
            value={draft.effect}
            onChange={(event) => setDraft((current) => ({ ...current, effect: event.target.value as TransitionEffect }))}
            className="mt-1 w-full rounded-md border border-[var(--studio-line)] bg-[var(--studio-fill)] px-2 py-1.5 text-xs"
          >
            {TRANSITION_EFFECTS.map((effect) => (
              <option key={effect} value={effect}>
                {t(`video.transition.effects.${EFFECT_KEY[effect]}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs">
          <span className="flex justify-between">
            <span className="font-semibold">{t("video.transition.duration")}</span>
            <span className="tabular-nums text-[var(--studio-muted)]">
              {draft.durationSec}
              {t("video.properties.secondsSuffix")}
            </span>
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={0.1}
            value={draft.durationSec}
            disabled={draft.effect === "none"}
            onChange={(event) => setDraft((current) => ({ ...current, durationSec: Number(event.target.value) }))}
            className="mt-1 w-full accent-[var(--studio-teal)] disabled:opacity-40"
          />
        </label>
        <p className="mt-2 text-[11px] text-[var(--studio-muted)]">{t("video.transition.exportHint")}</p>
        <div className="mt-4 flex justify-end gap-2">
          <StudioButton variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </StudioButton>
          <StudioButton
            onClick={() => {
              onSave({
                effect: draft.effect,
                durationSec: draft.effect === "none" ? fallback : draft.durationSec,
              });
              onClose();
            }}
          >
            {t("video.transition.apply")}
          </StudioButton>
        </div>
      </div>
    </DialogBackdrop>
  );
}
