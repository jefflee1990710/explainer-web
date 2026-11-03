"use client";

import { useEffect, useMemo, useRef } from "react";
import { Spinner } from "@/presentation/components/spinner";
import type { DetectedSourcePerson } from "@/service/fal/sam3-image";

export type JutsuPersonSlotAssignment = {
  keepOriginal: boolean;
  characterId: string;
  characterName: string;
  lookTab: "presets" | "historical";
  selectedLookKey: string;
  selectedLookUrl: string;
  lookLabel: string;
  uploadedPhotoUrl: string;
};

const PERSON_PALETTE = [
  { hex: "#d4ff33", rgb: [212, 255, 51] as const, badgeBg: "bg-lime text-accent-ink" },
  { hex: "#38bdf8", rgb: [56, 189, 248] as const, badgeBg: "bg-sky-400 text-zinc-950" },
  { hex: "#fbbf24", rgb: [251, 191, 36] as const, badgeBg: "bg-amber-400 text-zinc-950" },
  { hex: "#fb7185", rgb: [251, 113, 133] as const, badgeBg: "bg-rose-400 text-white" },
  { hex: "#a78bfa", rgb: [167, 139, 250] as const, badgeBg: "bg-violet-400 text-white" },
  { hex: "#34d399", rgb: [52, 211, 153] as const, badgeBg: "bg-emerald-400 text-zinc-950" },
] as const;

/** Decode a fal sparse RLE string `(flatIndex, runLength) ...` into a row-major `Uint8Array`. */
export function decodeClientSparseRle(
  counts: string,
  width: number,
  height: number,
): Uint8Array {
  const size = Math.max(0, width * height);
  const mask = new Uint8Array(size);
  const trimmed = (counts || "").trim();
  if (!trimmed || width <= 0 || height <= 0) return mask;

  const nums = trimmed.split(/\s+/).map((n) => Number(n));
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const start = nums[i]!;
    const len = nums[i + 1]!;
    if (!Number.isFinite(start) || !Number.isFinite(len) || len <= 0) continue;
    const from = Math.max(0, Math.floor(start));
    const to = Math.min(size, from + Math.floor(len));
    for (let p = from; p < to; p++) mask[p] = 1;
  }
  return mask;
}

/** Capture the current frame of an HTMLVideoElement as a scaled JPEG data URL. */
export function captureVideoFrameDataUrl(
  videoEl: HTMLVideoElement,
  maxEdge = 640,
): string | null {
  const vw = videoEl.videoWidth || 0;
  const vh = videoEl.videoHeight || 0;
  if (vw <= 0 || vh <= 0) return null;

  const scale = Math.min(1, maxEdge / Math.max(vw, vh));
  const w = Math.max(16, Math.round(vw * scale));
  const h = Math.max(16, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    ctx.drawImage(videoEl, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

/**
 * Pixel-accurate RLE silhouette overlay drawn directly on top of the source video preview.
 * Clicking a person's RLE mask switches `activePersonIndex`.
 */
export function JutsuPersonRleOverlay({
  people,
  activePersonIndex,
  assignments,
  onSelectPerson,
  isEn,
}: {
  people: readonly DetectedSourcePerson[];
  activePersonIndex: number;
  assignments: Record<number, JutsuPersonSlotAssignment>;
  onSelectPerson: (personIndex: number) => void;
  isEn: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const decodedMasks = useMemo(() => {
    return people.map((p) => ({
      person: p,
      mask: decodeClientSparseRle(p.rle, p.width, p.height),
    }));
  }, [people]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || decodedMasks.length === 0) return;

    const w = decodedMasks[0]!.person.width;
    const h = decodedMasks[0]!.person.height;
    if (w <= 0 || h <= 0) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let i = 0; i < decodedMasks.length; i++) {
      const { person, mask } = decodedMasks[i]!;
      const palette = PERSON_PALETTE[i % PERSON_PALETTE.length]!;
      const [cr, cg, cb] = palette.rgb;
      const isActive = person.personIndex === activePersonIndex;
      const slot = assignments[person.personIndex];
      const isMapped = slot ? !slot.keepOriginal : false;

      const fillAlpha = isActive ? 92 : isMapped ? 64 : 26;
      const edgeAlpha = isActive ? 255 : isMapped ? 210 : 120;

      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
          const pIdx = row + x;
          if (!mask[pIdx]) continue;

          const isEdge =
            x === 0 ||
            x === w - 1 ||
            y === 0 ||
            y === h - 1 ||
            !mask[pIdx - 1] ||
            !mask[pIdx + 1] ||
            !mask[pIdx - w] ||
            !mask[pIdx + w];

          const outIdx = pIdx * 4;
          data[outIdx] = cr;
          data[outIdx + 1] = cg;
          data[outIdx + 2] = cb;
          data[outIdx + 3] = isEdge ? edgeAlpha : fillAlpha;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [decodedMasks, activePersonIndex, assignments]);

  if (people.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      <canvas
        ref={canvasRef}
        onClick={(ev) => {
          const canvas = canvasRef.current;
          if (!canvas || decodedMasks.length === 0) return;
          const rect = canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const nx = (ev.clientX - rect.left) / rect.width;
          const ny = (ev.clientY - rect.top) / rect.height;

          for (const { person, mask } of decodedMasks) {
            const px = Math.min(person.width - 1, Math.max(0, Math.floor(nx * person.width)));
            const py = Math.min(person.height - 1, Math.max(0, Math.floor(ny * person.height)));
            if (mask[py * person.width + px]) {
              ev.stopPropagation();
              onSelectPerson(person.personIndex);
              return;
            }
          }
        }}
        className="pointer-events-auto h-full w-full cursor-pointer object-contain"
      />

      {people.map((person, idx) => {
        const palette = PERSON_PALETTE[idx % PERSON_PALETTE.length]!;
        const isActive = person.personIndex === activePersonIndex;
        const slot = assignments[person.personIndex];
        const summary =
          slot && !slot.keepOriginal
            ? slot.uploadedPhotoUrl
              ? isEn
                ? "Custom Photo"
                : "自訂相片"
              : slot.characterName || (isEn ? "Selected" : "已指定")
            : isEn
              ? "Keep Original"
              : "保留原樣";

        const leftPct = Math.min(88, Math.max(6, (person.box.x + person.box.width / 2) * 100));
        const topPct = Math.min(86, Math.max(6, person.box.y * 100));

        return (
          <button
            key={person.personIndex}
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onSelectPerson(person.personIndex);
            }}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            className={`pointer-events-auto absolute -translate-x-1/2 cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold shadow-md transition ${
              isActive
                ? `${palette.badgeBg} ring-2 ring-white`
                : "bg-zinc-900/85 text-white hover:bg-zinc-900"
            }`}
          >
            #{person.personIndex} → {summary}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Active Person Tabs bar shown below the video preview so the user can switch which detected
 * RLE person they are mapping to a Scro Character + 9:16 Outfit below.
 */
export function JutsuPersonTabsBar({
  people,
  detecting,
  activePersonIndex,
  assignments,
  onSelectPerson,
  onRedetect,
  disabled,
  isEn,
}: {
  people: readonly DetectedSourcePerson[];
  detecting: boolean;
  activePersonIndex: number;
  assignments: Record<number, JutsuPersonSlotAssignment>;
  onSelectPerson: (personIndex: number) => void;
  onRedetect: () => void;
  disabled?: boolean;
  isEn: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-accent-ink/12 bg-white/85 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-accent-ink px-1.5 py-0.5 font-display text-[10px] font-bold text-lime">
            SAM 3 RLE
          </span>
          <span className="font-bold text-foreground">
            {detecting
              ? isEn
                ? "Segmenting people in opening frame…"
                : "正在用 SAM 3 RLE 分割首幀人物輪廓…"
              : people.length > 0
                ? isEn
                  ? `Detected ${people.length} ${people.length === 1 ? "person" : "people"} — click a person tab to assign character & outfit`
                  : `已偵測到 ${people.length} 位人物（點擊人物標籤，喺下方指定替換角色與穿搭）`
                : isEn
                  ? "Single-person mode (click Redetect to scan frame for multiple people)"
                  : "預設單人模式（可按「重新偵測人物」掃描多人輪廓）"}
          </span>
        </div>

        <button
          type="button"
          disabled={disabled || detecting}
          onClick={onRedetect}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/20 bg-paper px-3 py-1 text-[11px] font-bold text-foreground transition hover:border-accent-ink disabled:opacity-50"
        >
          {detecting ? <Spinner className="h-3 w-3" /> : <span>↻</span>}
          <span>{isEn ? "Redetect People" : "重新偵測人物"}</span>
        </button>
      </div>

      {people.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-0.5" role="tablist">
          {people.map((person, idx) => {
            const palette = PERSON_PALETTE[idx % PERSON_PALETTE.length]!;
            const active = person.personIndex === activePersonIndex;
            const slot = assignments[person.personIndex];
            const mappedText =
              slot && !slot.keepOriginal
                ? slot.uploadedPhotoUrl
                  ? isEn
                    ? "Custom Photo"
                    : "自訂上傳相片"
                  : `${slot.characterName || (isEn ? "Character" : "角色")}${slot.lookLabel ? ` · ${slot.lookLabel}` : ""}`
                : isEn
                  ? "Keep Original (No Swap)"
                  : "保留原人物（不替換）";

            return (
              <button
                key={person.personIndex}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => onSelectPerson(person.personIndex)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition ${
                  active
                    ? "border-2 border-accent-ink bg-white ring-2 ring-lime"
                    : "border-accent-ink/15 bg-paper/60 hover:border-accent-ink/40"
                }`}
              >
                <span
                  style={{ backgroundColor: palette.hex }}
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-accent-ink/40"
                />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-foreground">
                    {isEn ? `Person #${person.personIndex}` : `人物 #${person.personIndex}`}
                  </div>
                  <div className="truncate text-[10px] font-semibold text-muted">
                    → {mappedText}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
