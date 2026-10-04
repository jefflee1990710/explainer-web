"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { PlayIcon } from "@/presentation/components/project/production-icons";
import { Spinner } from "@/presentation/components/spinner";

export function ClipVideoPlaceholder({
  pending,
  disabled = false,
  cost,
  overImage = false,
  onGenerate,
}: {
  pending: boolean;
  disabled?: boolean;
  cost: number;
  // Start still sits behind this control until the clip file exists.
  overImage?: boolean;
  onGenerate: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onGenerate}
      disabled={pending || disabled}
      className={`absolute inset-0 grid cursor-pointer place-items-center border-2 border-dashed text-[var(--studio-ink)] transition disabled:cursor-not-allowed disabled:opacity-50 ${
        overImage
          ? "border-white/70 bg-white/45 hover:bg-white/60"
          : "border-[var(--studio-line)] bg-[var(--studio-panel)] hover:border-[var(--studio-ink)]/25 hover:bg-white"
      }`}
    >
      <span className="flex flex-col items-center gap-3 px-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--studio-ink)] text-white shadow-md">
          {pending ? <Spinner className="h-6 w-6" /> : <PlayIcon className="ml-0.5 h-7 w-7" />}
        </span>
        <span className="font-display text-[13px] font-bold">{t("production.video.playAfterGenerate")}</span>
        <span className="text-[11px] text-[var(--studio-muted)]">
          {t("production.video.generateThisClip", { cost })}
        </span>
      </span>
    </button>
  );
}
