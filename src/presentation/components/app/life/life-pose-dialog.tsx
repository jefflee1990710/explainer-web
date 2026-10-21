"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  LIFE_POSE_GROUPS,
  LIFE_POSE_HANDS,
  filterLifePoses,
  lifePoseById,
  type LifePoseGroup,
} from "@/model/life-pose";
import { LifePoseArt } from "@/presentation/components/app/life/life-pose-art";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";

// Group tabs, hand-action chips and a skeleton grid for picking a Life pose.
export function LifePoseDialog({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<LifePoseGroup>(lifePoseById(value)?.group ?? LIFE_POSE_GROUPS[0]);
  const [hand, setHand] = useState("");
  const inTab = useMemo(() => filterLifePoses(tab), [tab]);
  // Only offer hand chips that exist in this tab.
  const hands = LIFE_POSE_HANDS.filter((h) => inTab.some((pose) => pose.hands.includes(h)));
  const activeHand = hands.includes(hand as (typeof hands)[number]) ? hand : "";
  const poses = filterLifePoses(tab, activeHand || undefined);

  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chip = (active: boolean) =>
    `cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition ${
      active
        ? "bg-accent-ink text-paper"
        : "border border-accent-ink/15 bg-paper text-muted hover:border-accent-ink/40 hover:text-foreground"
    }`;

  return (
    <DialogBackdrop className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[min(85vh,52rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-accent-ink/10 bg-paper shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 space-y-2 border-b border-accent-ink/10 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold">
                {t("life.poses.title")}
              </h2>
              <p className="text-xs text-muted">{t("life.poses.hint")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {LIFE_POSE_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                role="tab"
                aria-selected={tab === group}
                onClick={() => setTab(group)}
                className={chip(tab === group)}
              >
                {t(`life.poses.groups.${group}`)}
              </button>
            ))}
          </div>
          {hands.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" aria-pressed={!activeHand} onClick={() => setHand("")} className={chip(!activeHand)}>
                {t("life.poses.allHands")}
              </button>
              {hands.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={activeHand === h}
                  onClick={() => setHand(activeHand === h ? "" : h)}
                  className={chip(activeHand === h)}
                >
                  {t(`life.poses.hands.${h}`)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div
            role="radiogroup"
            aria-label={t(`life.poses.groups.${tab}`)}
            className="grid w-full content-start gap-2 [grid-template-columns:repeat(auto-fill,minmax(6.5rem,1fr))]"
          >
            {poses.map((pose) => {
              const active = pose.id === value;
              return (
                <button
                  key={pose.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(pose.id);
                    onClose();
                  }}
                  className={`flex cursor-pointer flex-col rounded-xl border bg-paper p-1.5 text-left transition ${
                    active
                      ? "border-accent shadow-[2px_2px_0_0_#12141c]"
                      : "border-accent-ink/10 hover:border-accent-ink/30"
                  }`}
                >
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-lg bg-zinc-200">
                    <LifePoseArt id={pose.id} />
                    <span className="absolute top-1 right-1 rounded-full bg-paper/90 px-1.5 py-0.5 text-[9px] font-bold text-foreground">
                      {t(`life.poses.framing.${pose.framing}`)}
                    </span>
                  </span>
                  <span className="mt-1 block line-clamp-2 px-0.5 text-[11px] font-semibold leading-4">
                    {t(`life.poses.names.${pose.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </DialogBackdrop>
  );
}
