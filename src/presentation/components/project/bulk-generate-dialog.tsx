"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import {
  FRAMES_COST,
  VIDEO_COST,
  planGenerateAllClips,
  planGenerateAllScenes,
  planRemaining,
} from "@/service/production-plan";
import type { PublicVideo } from "@/presentation/serialize";

export type BulkMode = "remaining" | "scenes" | "clips";

const MODES: Array<{ id: BulkMode; label: string; hint: string; overwrites: boolean }> = [
  {
    id: "remaining",
    label: "補完未完成",
    hint: "只處理沒畫格、失敗的段落，並替畫格完成的段落產片。已完成的不動。",
    overwrites: false,
  },
  {
    id: "scenes",
    label: "只畫畫格",
    hint: "重畫每一段的起始與結尾畫格。正在畫的段落會略過。",
    overwrites: true,
  },
  {
    id: "clips",
    label: "畫格＋影片",
    hint: "重畫每一段畫格，兩張都完成後自動產片；影片 credits 在那時才扣。",
    overwrites: true,
  },
];

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
  const titleId = useId();
  const [mode, setMode] = useState<BulkMode>("remaining");
  const plan =
    mode === "remaining"
      ? planRemaining(project)
      : mode === "scenes"
        ? planGenerateAllScenes(project)
        : planGenerateAllClips(project);
  const list = (numbers: number[]) => numbers.map((n) => `#${n}`).join("、");
  const short = credits < plan.cost;
  const current = MODES.find((item) => item.id === mode)!;

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
          全部產生
        </h2>

        <fieldset className="mt-4 flex flex-col gap-2" disabled={pending}>
          <legend className="sr-only">產生範圍</legend>
          {MODES.map((item) => (
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
                  {item.overwrites ? (
                    <span className="rounded-sm bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">
                      會覆蓋已完成段落
                    </span>
                  ) : (
                    <span className="rounded-sm bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800">
                      建議
                    </span>
                  )}
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
                <td className="py-1.5">{list(plan.frames)} 畫格</td>
                <td className="py-1.5 text-right tabular-nums">
                  {plan.frames.length} 段 × {FRAMES_COST} = {plan.frames.length * FRAMES_COST}
                </td>
              </tr>
            ) : null}
            {plan.videos.length ? (
              <tr className="border-b border-dashed border-[var(--studio-line)]">
                <td className="py-1.5">
                  {list(plan.videos)} 影片{current.id === "clips" ? "（畫格完成後才扣）" : ""}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {plan.videos.length} 段 × {VIDEO_COST} = {plan.videos.length * VIDEO_COST}
                </td>
              </tr>
            ) : null}
            <tr>
              <td className="py-1.5 font-semibold">合計</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">
                {plan.cost} credits{" "}
                <span className="font-normal text-[var(--studio-muted)]">（剩餘 {credits}）</span>
              </td>
            </tr>
          </tbody>
        </table>
        {plan.cost === 0 ? (
          <p className="mt-2 text-xs text-[var(--studio-muted)]">沒有需要處理的段落。</p>
        ) : short ? (
          <p className="mt-2 text-xs text-accent">
            credits 不足，請先
            <Link href="/app/billing" className="font-semibold underline">
              升級方案
            </Link>
            。
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <StudioButton variant="ghost" onClick={onCancel} disabled={pending}>
            取消
          </StudioButton>
          <StudioButton
            onClick={() => onConfirm(mode)}
            disabled={pending || short || plan.cost === 0}
          >
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? "送出中…" : `確認送出 · ${plan.cost}`}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
