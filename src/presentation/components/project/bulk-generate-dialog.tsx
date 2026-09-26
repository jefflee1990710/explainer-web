"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { Spinner } from "@/presentation/components/spinner";
import { FRAMES_COST, VIDEO_COST, type BulkGeneratePlan } from "@/service/production-plan";

// Confirm a bulk Phase B run before charging every clip at once.
export function BulkGenerateDialog({
  mode,
  plan,
  credits,
  pending,
  onCancel,
  onConfirm,
}: {
  mode: "scenes" | "clips";
  plan: BulkGeneratePlan;
  credits: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const title = mode === "scenes" ? "產生全部分鏡圖？" : "產生全部分鏡與影片？";
  const list = (numbers: number[]) => numbers.map((n) => `#${n}`).join("、");
  const short = credits < plan.cost;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={pending ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "scenes"
            ? "會重畫每一段的起始與結尾分鏡圖。正在畫的段落會略過。"
            : "會先重畫每一段的分鏡圖。某一段的起始與結尾圖都完成後，才會開始產該段影片。"}
        </p>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {plan.frames.length ? (
              <tr className="border-b border-dashed border-accent-ink/10">
                <td className="py-1.5">{list(plan.frames)} 分鏡圖</td>
                <td className="py-1.5 text-right tabular-nums">
                  {plan.frames.length} 段 × {FRAMES_COST} = {plan.frames.length * FRAMES_COST}
                </td>
              </tr>
            ) : null}
            {plan.videos.length ? (
              <tr className="border-b border-dashed border-accent-ink/10">
                <td className="py-1.5">{list(plan.videos)} 影片（畫格完成後才扣）</td>
                <td className="py-1.5 text-right tabular-nums">
                  {plan.videos.length} 段 × {VIDEO_COST} = {plan.videos.length * VIDEO_COST}
                </td>
              </tr>
            ) : null}
            <tr>
              <td className="py-1.5 font-semibold">合計</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">
                {plan.cost} credits <span className="font-normal text-muted">（剩餘 {credits}）</span>
              </td>
            </tr>
          </tbody>
        </table>
        {short ? (
          <p className="mt-2 text-xs text-accent">
            credits 不足，請先
            <Link href="/app/billing" className="font-semibold underline">
              升級方案
            </Link>
            。
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || short || plan.cost === 0}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? "送出中…" : `確認送出 · ${plan.cost}`}
          </button>
        </div>
      </div>
    </div>
  );
}
