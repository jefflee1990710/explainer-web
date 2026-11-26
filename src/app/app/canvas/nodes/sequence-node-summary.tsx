"use client";

// Sequence card body: clip / layer / audio counts, length, and the button that opens the
// bottom timeline drawer.

import { useMemo } from "react";
import { AlertTriangle, Rows3 } from "lucide-react";
import { sequenceSourceDurations } from "@/service/canvas/core/edit-media";
import {
  readSequence,
  sequenceIssues,
  sequenceLengthKnown,
  sequenceTotalSec,
  syncSequenceWithEdges,
} from "@/service/canvas/core/sequence";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";
import { formatSec } from "@/app/app/canvas/timeline/sequence-timeline-model";

export function SequenceNodeSummary({ nodeId, isZh }: { nodeId: string; isZh: boolean }) {
  const { nodes, edges, onOpenTimeline } = useCanvasNodeActions();
  const node = nodes.find((n) => n.id === nodeId);
  const toolParams = node?.data.toolParams;
  const summary = useMemo(() => {
    const seq = syncSequenceWithEdges(readSequence(toolParams), nodeId, edges);
    const durations = sequenceSourceDurations({ nodes, edges }, nodeId);
    return {
      seq,
      total: sequenceLengthKnown(seq, durations) ? sequenceTotalSec(seq, durations) : undefined,
      issues: sequenceIssues(seq, durations),
    };
  }, [edges, nodeId, nodes, toolParams]);
  const { seq, total, issues } = summary;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-3 gap-1 text-center">
        {[
          [seq.tracks.video.length, isZh ? "片段" : "Clips"],
          [seq.tracks.overlay.length, isZh ? "疊加" : "Layers"],
          [seq.tracks.audio.length, isZh ? "音訊" : "Audio"],
        ].map(([count, label]) => (
          <div key={String(label)} className="rounded-[8px] border border-white/8 bg-[#12161f] py-1">
            <div className="text-[13px] font-bold text-white">{count}</div>
            <div className="text-[9.5px] text-white/45">{label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10.5px] text-white/55">
        <span>
          {isZh ? "長度" : "Length"} {formatSec(total)} · {seq.aspectRatio} · {seq.resolution === "4k" ? "4K" : seq.resolution}
        </span>
        {issues.length ? (
          <span className="flex items-center gap-1 text-amber-300" title={issues.map((i) => i.message).join("\n")}>
            <AlertTriangle className="h-3 w-3" />
            {issues.length}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onOpenTimeline?.(nodeId);
        }}
        className="nodrag flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-[#c6f24b]/40 bg-[#c6f24b]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#c6f24b] transition hover:bg-[#c6f24b]/20"
      >
        <Rows3 className="h-3.5 w-3.5" />
        {isZh ? "開啟時間線" : "Open timeline"}
      </button>
    </div>
  );
}
