"use client";

import { useEffect, useId } from "react";
import { Spinner } from "@/components/spinner";
import type { ClipState } from "@/lib/clip-stage";
import { FRAMES_COST, VIDEO_COST, type RemainingPlan } from "@/lib/production-plan";

// Confirm "補齊剩餘": itemised cost before charging several clips at once.
export function FillRemainingDialog({
  plan,
  states,
  credits,
  pending,
  onCancel,
  onConfirm,
}: {
  plan: RemainingPlan;
  states: ClipState[];
  credits: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  // Split frames into fresh vs. retry so the user sees why a clip is listed.
  const retryFrames = plan.frames.filter(
    (n) => states.find((s) => s.clipNumber === n)?.stage === "frames_failed",
  );
  const freshFrames = plan.frames.filter((n) => !retryFrames.includes(n));
  const list = (numbers: number[]) => numbers.map((n) => `#${n}`).join("、");
  const short = credits < plan.cost;

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
          補齊剩餘段落
        </h2>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {freshFrames.length ? (
              <tr className="border-b border-dashed border-accent-ink/10">
                <td className="py-1.5">{list(freshFrames)} 產生畫格</td>
                <td className="py-1.5 text-right tabular-nums">
                  {freshFrames.length} 段 × {FRAMES_COST} = {freshFrames.length * FRAMES_COST}
                </td>
              </tr>
            ) : null}
            {retryFrames.length ? (
              <tr className="border-b border-dashed border-accent-ink/10">
                <td className="py-1.5">{list(retryFrames)} 重試畫格（上次失敗已退款）</td>
                <td className="py-1.5 text-right tabular-nums">
                  {retryFrames.length} 段 × {FRAMES_COST} = {retryFrames.length * FRAMES_COST}
                </td>
              </tr>
            ) : null}
            {plan.videos.length ? (
              <tr className="border-b border-dashed border-accent-ink/10">
                <td className="py-1.5">{list(plan.videos)} 產生影片</td>
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
        <p className="mt-3 text-xs leading-5 text-muted">
          不會動到已有畫格或影片，也不會處理標了「需重做」的段落。畫格完成後，那些段落的影片要再按一次。
        </p>
        {short ? <p className="mt-2 text-xs text-accent">credits 不足，請先升級方案。</p> : null}
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
            disabled={pending || short}
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
