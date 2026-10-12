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
      className={`absolute inset-0 flex cursor-pointer flex-col items-center border-2 border-dashed text-[var(--studio-ink)] transition disabled:cursor-not-allowed disabled:opacity-50 ${
        overImage
          ? "justify-start border-white/70 bg-transparent pt-[8%] hover:bg-white/10"
          : "justify-center border-[var(--studio-line)] bg-[var(--studio-panel)] hover:border-[var(--studio-ink)]/25 hover:bg-white"
      }`}
    >
      <span className={`flex flex-col items-center px-3 ${overImage ? "absolute inset-x-0 top-2 gap-1" : "gap-3"}`}>
        <span
          className={`grid place-items-center rounded-full bg-[var(--studio-ink)] text-white shadow-md ${
            overImage ? "h-9 w-9" : "h-14 w-14"
          }`}
        >
          {pending ? (
            <Spinner className={overImage ? "h-4 w-4" : "h-6 w-6"} />
          ) : (
            <PlayIcon className={overImage ? "ml-0.5 h-4 w-4" : "ml-0.5 h-7 w-7"} />
          )}
        </span>
        <span
          className={`font-display font-bold ${
            overImage ? "rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white" : "text-[13px]"
          }`}
        >
          {t("production.video.playAfterGenerate")}
        </span>
        {overImage ? null : (
          <span className="text-[11px] text-[var(--studio-muted)]">
            {t("production.video.generateThisClip", { cost })}
          </span>
        )}
      </span>
    </button>
  );
}
