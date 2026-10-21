"use client";

import { lifePoseById } from "@/model/life-pose";
import { LifePoseArt } from "@/presentation/components/app/life/life-pose-art";
import { useI18n } from "@/presentation/components/i18n-provider";

// Compact row showing the chosen pose, or a button to open the pose library.
export function LifePoseBar({
  poseId,
  disabled,
  emptyHint,
  onOpenPicker,
  onClear,
}: {
  poseId: string;
  disabled: boolean;
  emptyHint?: string;
  onOpenPicker: () => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const pose = lifePoseById(poseId);

  if (!pose) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-accent-ink/12 bg-paper p-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-foreground">
            尚未選擇特定姿勢（使用預設自然姿勢）
          </p>
          <p className="truncate text-[11px] text-muted">
            {emptyHint ?? t("life.poses.hint")}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onOpenPicker}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full bg-accent-ink px-3.5 text-xs font-bold text-lime disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("life.poses.title")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-accent bg-paper p-2.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpenPicker}
        aria-label={t("life.poses.change")}
        className="block aspect-[3/4] w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-zinc-200 disabled:cursor-not-allowed"
      >
        <LifePoseArt id={pose.id} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-foreground">
          <span className="text-muted">{t("life.poses.title")} · </span>
          {t(`life.poses.names.${pose.id}`)}
          <span className="ml-1.5 text-[10px] font-semibold text-muted">
            {t(`life.poses.framing.${pose.framing}`)}
          </span>
        </p>
        <p className="text-[10px] text-muted">{t("life.poses.selectedHint")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={onOpenPicker}
          className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-foreground disabled:opacity-60"
        >
          {t("life.poses.change")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-foreground disabled:opacity-60"
        >
          {t("life.poses.clear")}
        </button>
      </div>
    </div>
  );
}
