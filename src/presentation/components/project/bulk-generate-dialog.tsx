"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useEffect, useId, useMemo, useRef } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import {
  cheapestVideoCost,
  needsVideoUpgrade,
  planGenerateAllClips,
  planGenerateAllScenes,
  planRemaining,
} from "@/service/production-plan";
import type { PublicVideo } from "@/presentation/serialize";

export type BulkMode = "remaining" | "scenes" | "clips";

function planForMode(project: PublicVideo, mode: BulkMode) {
  if (mode === "remaining") return planRemaining(project);
  if (mode === "scenes") return planGenerateAllScenes(project);
  return planGenerateAllClips(project);
}

// Lightweight confirm after picking a bulk action from the toolbar.
export function BulkGenerateDialog({
  project,
  mode,
  credits,
  pending,
  onCancel,
  onConfirm,
}: {
  project: PublicVideo;
  mode: BulkMode;
  credits: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (mode: BulkMode) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const plan = useMemo(() => planForMode(project, mode), [project, mode]);
  const videoUpgrade =
    plan.videos.length > 0 && needsVideoUpgrade(credits, cheapestVideoCost(project, plan.videos));
  const short = !videoUpgrade && credits < plan.cost;
  const canConfirm = !pending && plan.cost > 0;

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (pending) return;
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key === "Enter" && canConfirm) {
        event.preventDefault();
        onConfirm(mode);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel, onConfirm, mode, canConfirm]);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/30 p-4"
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
          {t(`production.bulk.mode.${mode}.label`)}
        </h2>
        <p className="mt-2 text-sm text-[var(--studio-muted)]">
          {t(`production.bulk.mode.${mode}.hint`)}
        </p>
        {plan.cost === 0 ? (
          <p className="mt-4 text-xs text-[var(--studio-muted)]">{t("production.bulk.empty")}</p>
        ) : (
          <p className="mt-4 text-xs text-[var(--studio-muted)]">{t("production.bulk.confirmShortcut")}</p>
        )}
        {!pending && plan.cost > 0 && short ? (
          <p className="mt-2 text-xs text-accent">{t("production.bulk.insufficientCredits")}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <StudioButton variant="ghost" onClick={onCancel} disabled={pending}>
            {t("production.action.cancel")}
          </StudioButton>
          <StudioButton
            ref={confirmRef}
            onClick={() => onConfirm(mode)}
            disabled={!canConfirm}
          >
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? t("production.action.submitting") : t("production.bulk.confirm")}
          </StudioButton>
        </div>
      </div>
    </DialogBackdrop>
  );
}
