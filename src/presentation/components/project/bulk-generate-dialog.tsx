"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import {
  cheapestVideoCost,
  FRAMES_COST,
  needsVideoUpgrade,
  VIDEO_CREDITS_PER_SECOND,
  planGenerateAllClips,
  planGenerateAllScenes,
  planRemaining,
} from "@/service/production-plan";
import type { PublicVideo } from "@/presentation/serialize";

export type BulkMode = "remaining" | "scenes" | "clips";

const MODE_IDS: BulkMode[] = ["remaining", "scenes", "clips"];

// Confirm a bulk run: pick a mode, see every clip's cost, then charge.
export function BulkGenerateDialog({
  project,
  credits,
  pending,
  onCancel,
  onConfirm,
}: {
  project: PublicVideo;
  credits: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (mode: BulkMode) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [mode, setMode] = useState<BulkMode>("clips");
  const modes = useMemo(
    () =>
      MODE_IDS.map((id) => ({
        id,
        label: t(`production.bulk.mode.${id}.label`),
        hint: t(`production.bulk.mode.${id}.hint`),
        overwrites: id !== "remaining",
        recommended: id === "clips",
      })),
    [t],
  );
  const plan =
    mode === "remaining"
      ? planRemaining(project)
      : mode === "scenes"
        ? planGenerateAllScenes(project)
        : planGenerateAllClips(project);
  const list = (numbers: number[]) => numbers.map((n) => `#${n}`).join("、");
  const videoUpgrade =
    plan.videos.length > 0 && needsVideoUpgrade(credits, cheapestVideoCost(project, plan.videos));
  const videoTotal = plan.cost - plan.frames.length * FRAMES_COST;
  const short = !videoUpgrade && credits < plan.cost;
  const current = modes.find((item) => item.id === mode)!;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={pending ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="studio-app w-full max-w-md rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {t("production.bulk.title")}
        </h2>

        <fieldset className="mt-4 flex flex-col gap-2" disabled={pending}>
          <legend className="sr-only">{t("production.bulk.legend")}</legend>
          {modes.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 ${
                mode === item.id
                  ? "border-[var(--studio-teal)] bg-[var(--studio-canvas)]"
                  : "border-[var(--studio-line)]"
              }`}
            >
              <input
                type="radio"
                name="bulk-mode"
                checked={mode === item.id}
                onChange={() => setMode(item.id)}
                className="mt-1 accent-[var(--studio-teal)]"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {item.label}
                  {item.recommended ? (
                    <span className="rounded-sm bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800">
                      {t("production.bulk.badgeRecommended")}
                    </span>
                  ) : null}
                  {item.overwrites ? (
                    <span className="rounded-sm bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">
                      {t("production.bulk.badgeOverwrites")}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--studio-muted)]">{item.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <table className="mt-4 w-full text-sm">
          <tbody>
            {plan.frames.length ? (
              <tr className="border-b border-dashed border-[var(--studio-line)]">
                <td className="py-1.5">
                  {t("production.bulk.row.frames", { clips: list(plan.frames) })}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {t("production.bulk.row.framesCost", {
                    count: plan.frames.length,
                    cost: FRAMES_COST,
                    total: plan.frames.length * FRAMES_COST,
                  })}
                </td>
              </tr>
            ) : null}
            {plan.videos.length ? (
              <tr className="border-b border-dashed border-[var(--studio-line)]">
                <td className="py-1.5">
                  {t("production.bulk.row.videos", { clips: list(plan.videos) })}
                  {current.id === "clips" ? t("production.bulk.row.videosDeferredNote") : ""}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {t("production.bulk.row.videosCost", {
                    count: plan.videos.length,
                    rate: VIDEO_CREDITS_PER_SECOND,
                    total: videoTotal,
                  })}
                </td>
              </tr>
            ) : null}
            <tr>
              <td className="py-1.5 font-semibold">{t("production.bulk.row.total")}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">
                {t("production.bulk.row.totalCredits", { cost: plan.cost })}{" "}
                <span className="font-normal text-[var(--studio-muted)]">
                  {t("production.bulk.row.remaining", { remaining: credits })}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        {plan.cost === 0 ? (
          <p className="mt-2 text-xs text-[var(--studio-muted)]">{t("production.bulk.empty")}</p>
        ) : short ? (
          <p className="mt-2 text-xs text-accent">{t("production.bulk.insufficientCredits")}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <StudioButton variant="ghost" onClick={onCancel} disabled={pending}>
            {t("production.action.cancel")}
          </StudioButton>
          <StudioButton onClick={() => onConfirm(mode)} disabled={pending || plan.cost === 0}>
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? t("production.action.submitting") : t("production.bulk.confirm", { cost: plan.cost })}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
