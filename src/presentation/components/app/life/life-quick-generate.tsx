"use client";

import { Spinner } from "@/presentation/components/spinner";
import { FRAME_COST } from "@/service/credit-costs";
import { useI18n } from "@/presentation/components/i18n-provider";

// One-click Life generate: fixed street OOTD or random post template.
export function LifeQuickGenerate({
  disabled,
  pending,
  error,
  onGenerate,
  onRandom,
}: {
  disabled: boolean;
  pending: boolean;
  error: string;
  onGenerate: () => void;
  onRandom: () => void;
}) {
  const { t } = useI18n();
  const busy = pending || disabled;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 p-4">
      <div className="space-y-2 rounded-xl border border-accent-ink/10 bg-accent-ink/3 px-3 py-3">
        <p className="text-xs font-bold text-foreground">用目前造型快速出圖</p>
        <p className="text-[11px] leading-relaxed text-muted">
          「生成」固定用街頭全身 OOTD；「隨機」從全部貼文類型抽一個立刻出圖。姿勢、場景與其他選項請切到進階設定。
        </p>
      </div>

      <div className="mt-auto space-y-2">
        {error ? (
          <p className="text-[11px] font-semibold text-red-600">{error}</p>
        ) : (
          <p className="text-[11px] text-muted">
            用目前 LOOK 出圖 · Generate uses your current look
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onGenerate}
            className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full bg-accent px-5 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {pending ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
            {pending ? "排入背景佇列中..." : t("life.generate")}
            <span className="ml-2 font-medium opacity-85">
              · {t("life.cost", { cost: FRAME_COST })}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRandom}
            className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full border border-accent-ink/20 bg-paper px-5 text-xs font-bold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            隨機 · Random
            <span className="ml-2 font-medium text-muted">
              · {t("life.cost", { cost: FRAME_COST })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
