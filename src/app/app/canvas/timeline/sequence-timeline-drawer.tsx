"use client";

// Bottom drawer that edits one `ffmpeg:sequence` node's timeline. The wires stay the source of
// truth: wiring adds items, removing an item deletes its wire. Run renders it in one FFmpeg job.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { AlertTriangle, Loader2, Minus, Pause, Play, Plus, Rows3, Type, X } from "lucide-react";
import type { CanvasSequence } from "@/model/canvas-sequence";
import {
  placeClips,
  readSequence,
  sameSequence,
  sequenceIssues,
  sequenceLengthKnown,
  sequenceTotalSec,
  syncSequenceWithEdges,
} from "@/service/canvas/core/sequence";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";
import { SequenceInspector } from "@/app/app/canvas/timeline/sequence-inspector";
import { SequencePreview } from "@/app/app/canvas/timeline/sequence-preview";
import { SequenceTracks } from "@/app/app/canvas/timeline/sequence-tracks";
import {
  addTextLayer,
  fitZoomIndex,
  formatSec,
  removeTextLayer,
  selectionRef,
  type SequenceSelection,
} from "@/app/app/canvas/timeline/sequence-timeline-model";
import { useSequenceSources } from "@/app/app/canvas/timeline/use-sequence-sources";

const ZOOMS = [8, 15, 25, 40, 60, 90];

export function SequenceTimelineDrawer({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { nodes, edges, catalog, locale, isFlowRunning, onUpdateNodeData, onRunNode } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const t = (zh: string, en: string) => (isZh ? zh : en);
  const { deleteElements } = useReactFlow();
  const node = nodes.find((n) => n.id === nodeId);
  const toolParams = node?.data.toolParams;

  const stored = useMemo(() => readSequence(toolParams), [toolParams]);
  const seq = useMemo(() => syncSequenceWithEdges(stored, nodeId, edges), [stored, nodeId, edges]);
  const sources = useSequenceSources({ nodeId, nodes, edges, catalog, locale, isZh });
  const durations = useMemo(
    () => Object.fromEntries(Object.entries(sources).map(([ref, s]) => [ref, s.durationSec])),
    [sources],
  );
  const placed = useMemo(() => placeClips(seq, durations), [seq, durations]);
  const totalSec = useMemo(() => sequenceTotalSec(seq, durations), [seq, durations]);
  const lengthKnown = sequenceLengthKnown(seq, durations);
  const issues = useMemo(() => sequenceIssues(seq, durations), [seq, durations]);

  const [selection, setSelection] = useState<SequenceSelection>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  // null = fit the whole timeline into the track pane until the user zooms.
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const [paneWidth, setPaneWidth] = useState(0);
  const paneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setPaneWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const zoom = userZoom ?? fitZoomIndex(ZOOMS, paneWidth, totalSec, 80);
  const setZoom = (update: (z: number) => number) => setUserZoom(update(zoom));

  const save = useCallback(
    (next: CanvasSequence) => onUpdateNodeData(nodeId, { toolParams: { ...(toolParams ?? {}), sequence: next } }),
    [nodeId, onUpdateNodeData, toolParams],
  );

  // New or removed wires are written into the stored document while the drawer is open.
  useEffect(() => {
    if (node && !sameSequence(stored, seq)) save(seq);
  }, [node, save, seq, stored]);

  const onStop = useCallback(() => setPlaying(false), []);
  const onSeek = useCallback((sec: number) => {
    setPlaying(false);
    setTime(sec);
  }, []);

  if (!node) return null;

  const captionsWired = edges.some((e) => e.target === nodeId && e.targetHandle === "prompt");
  const running = node.data.status === "queued" || node.data.status === "running";

  const removeSelected = () => {
    const ref = selectionRef(seq, selection);
    if (ref) void deleteElements({ edges: [{ id: ref }] });
    else if (selection?.kind === "layer") save(removeTextLayer(seq, selection.id));
    setSelection(null);
  };

  return (
    <div
      className="nodrag nowheel absolute inset-x-0 bottom-0 z-40 flex h-[340px] flex-col border-t border-white/10 bg-[#0e121a]/97 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
      data-testid="sequence-timeline"
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/8 px-3">
        <Rows3 className="h-4 w-4 text-[#c6f24b]" />
        <span className="text-[12px] font-bold text-white">{t("時間線", "Timeline")}</span>
        <span className="text-[11px] text-white/45">
          {seq.tracks.video.length} {t("段片段", "clips")} · {lengthKnown ? formatSec(totalSec) : t("長度未知", "length unknown")} ·{" "}
          {seq.aspectRatio} {seq.resolution === "4k" ? "4K" : seq.resolution}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={placed.length === 0}
          className="ml-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
          aria-label={playing ? t("暫停", "Pause") : t("播放", "Play")}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <span className="w-[86px] font-mono text-[11px] text-white/70">
          {formatSec(time)} / {formatSec(totalSec)}
        </span>
        <button
          type="button"
          onClick={() => {
            const { seq: next, id } = addTextLayer(seq, time, t("標題", "Title"), totalSec);
            save(next);
            setSelection({ kind: "layer", id });
          }}
          className="flex cursor-pointer items-center gap-1 rounded-[8px] border border-white/12 bg-white/6 px-2 py-1 text-[11px] text-white/85 hover:bg-white/12"
        >
          <Type className="h-3 w-3" />
          {t("加文字", "Add text")}
        </button>
        <div className="flex items-center gap-0.5 rounded-[8px] border border-white/10 px-1">
          <button type="button" aria-label={t("縮小", "Zoom out")} onClick={() => setZoom((z) => Math.max(0, z - 1))} className="cursor-pointer p-1 text-white/70 hover:text-white">
            <Minus className="h-3 w-3" />
          </button>
          <button type="button" aria-label={t("放大", "Zoom in")} onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} className="cursor-pointer p-1 text-white/70 hover:text-white">
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {issues.length ? (
          <span className="flex items-center gap-1 truncate text-[11px] text-amber-300" title={issues.map((i) => i.message).join("\n")}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {issues.length} {t("個問題", "issue(s)")}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={running || isFlowRunning || placed.length === 0}
            onClick={() => onRunNode(nodeId)}
            className="flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-[#c6f24b] px-3 py-1.5 text-[11px] font-bold text-[#11141b] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {running ? t("輸出中…", "Rendering…") : t("輸出影片", "Render")}
          </button>
          <button type="button" onClick={onClose} aria-label={t("關閉時間線", "Close timeline")} className="cursor-pointer rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body: preview · tracks · inspector */}
      <div className="flex min-h-0 flex-1">
        <div className="w-[170px] shrink-0 border-r border-white/8">
          <SequencePreview
            seq={seq}
            placed={placed}
            sources={sources}
            totalSec={totalSec}
            time={time}
            playing={playing}
            onTime={setTime}
            onStop={onStop}
          />
        </div>
        <div ref={paneRef} className="min-w-0 flex-1 overflow-auto" onPointerDown={() => setSelection(null)}>
          {placed.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[12px] text-white/45">
              {t("把影片連到這個節點的「片段」輸入，就會出現在時間線上", "Wire videos into this node's Clips input to place them here")}
            </div>
          ) : (
            <SequenceTracks
              seq={seq}
              placed={placed}
              totalSec={totalSec}
              sources={sources}
              pps={ZOOMS[zoom]!}
              time={time}
              selection={selection}
              isZh={isZh}
              onSelect={setSelection}
              onSeek={onSeek}
              onChange={save}
            />
          )}
        </div>
        <div className="w-[250px] shrink-0 overflow-y-auto border-l border-white/8 p-3">
          <SequenceInspector
            seq={seq}
            selection={selection}
            sources={sources}
            isZh={isZh}
            captionsText={node.data.prompt ?? ""}
            captionsWired={captionsWired}
            onChange={save}
            onCaptionsText={(prompt) => onUpdateNodeData(nodeId, { prompt })}
            onRemove={removeSelected}
          />
        </div>
      </div>
    </div>
  );
}
