"use client";

import { motion } from "framer-motion";
import { WarnIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { ClipStage, ClipState } from "@/lib/clip-stage";
import { mediaSrc } from "@/lib/media-src";
import type { PublicVideo } from "@/lib/serialize";

export const STAGE_LABEL: Record<ClipStage, string> = {
  no_frames: "待畫格",
  frames_generating: "畫格中",
  frames_failed: "畫格失敗",
  frames_ready: "畫格完成",
  video_generating: "產片中",
  video_failed: "影片失敗",
  video_ready: "影片完成",
};

// Chip colour per stage (text colour is never the only cue: label + icon too).
const STAGE_CLASS: Record<ClipStage, string> = {
  no_frames: "border-dashed border-accent-ink/25 bg-paper text-muted",
  frames_generating: "border-[#d8b400]/60 bg-[#fff7cc] text-accent-ink",
  frames_failed: "border-accent/50 bg-accent/10 text-accent",
  frames_ready: "border-accent-ink/20 bg-paper text-accent-ink",
  video_generating: "border-[#d8b400]/60 bg-[#fff7cc] text-accent-ink",
  video_failed: "border-accent/50 bg-accent/10 text-accent",
  video_ready: "border-teal/50 bg-teal/15 text-[#0f766e]",
};

const BUSY: ReadonlySet<ClipStage> = new Set(["frames_generating", "video_generating"]);

// Horizontal rail of clip chips; the selected one drives the workspace below.
export function ClipTimeline({
  project,
  states,
  selected,
  pending = "",
  onSelect,
}: {
  project: PublicVideo;
  states: ClipState[];
  selected: number;
  pending?: string;
  onSelect: (clipNumber: number) => void;
}) {
  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-1">
      <ol role="tablist" aria-label="Clip 時間軸" className="flex min-w-max gap-2">
        {states.map((state, index) => {
          const row = project.phaseA?.clips.find((item) => item.clipNumber === state.clipNumber);
          const start = project.frames.find(
            (frame) =>
              frame.clipNumber === state.clipNumber &&
              frame.position === "start",
          );
          const startBusy =
            pending === `frames:${state.clipNumber}` ||
            pending === `clip:${state.clipNumber}:regen` ||
            pending === `frame:${state.clipNumber}:start` ||
            start?.status === "queued" ||
            start?.status === "in_progress";
          const src = startBusy ? undefined : mediaSrc(start);
          const isSelected = state.clipNumber === selected;
          const stale = state.stale.frames || state.stale.video;
          return (
            <motion.li
              key={state.clipNumber}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`#${state.clipNumber} ${row?.timeRange || ""} ${STAGE_LABEL[state.stage]}`}
                onClick={() => onSelect(state.clipNumber)}
                className={`relative aspect-square w-[4.75rem] cursor-pointer overflow-hidden rounded-md border text-left transition sm:w-[5.25rem] ${STAGE_CLASS[state.stage]} ${
                  isSelected ? "outline outline-2 outline-offset-2 outline-accent-ink" : "hover:-translate-y-0.5"
                }`}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 bg-current/5" aria-hidden />
                )}
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-accent-ink/85 via-accent-ink/55 to-transparent px-1.5 pb-1.5 pt-6 text-paper">
                  <span className="font-display text-[11px] font-bold leading-none">
                    #{state.clipNumber}
                    <span className="ml-0.5 font-normal text-[9px] text-paper/80">
                      {row?.timeRange}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold leading-none">
                    {BUSY.has(state.stage) ? <Spinner className="h-2.5 w-2.5 shrink-0" /> : null}
                    <span className="truncate">{STAGE_LABEL[state.stage]}</span>
                    {stale ? (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-accent px-1 text-[9px] font-bold text-white">
                        <WarnIcon />
                        需重做
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
