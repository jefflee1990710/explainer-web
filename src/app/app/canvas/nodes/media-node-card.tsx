"use client";

// Media node card: displays uploaded or library Image / Video / Audio and exposes a typed output handle.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Film, Image as ImageIcon, Maximize2, Music, Trash2 } from "lucide-react";
import { isUnsettledMediaUpload, type CanvasNodeData } from "@/model/canvas";
import { previewMediaUrl } from "@/service/canvas/core/media-proxy";
import { MediaUploadPlaceholder } from "@/app/app/canvas/nodes/media-upload-placeholder";
import {
  PORT_COLOR_MAP,
  useCanvasNodeActions,
} from "@/app/app/canvas/nodes/port-colors";

export function MediaNodeCard({
  id,
  data,
  selected,
}: NodeProps & { data: CanvasNodeData }) {
  const { onDeleteNode, onOpenLightbox } = useCanvasNodeActions();
  const kind = data.mediaKind ?? "image";
  const color = PORT_COLOR_MAP[kind];
  const fileName = data.fileName || data.label || kind.toUpperCase();

  // Same node id: the card swaps to the real preview once mediaUrl replaces mediaUpload.
  if (isUnsettledMediaUpload(data) && data.mediaUpload && kind !== "audio") {
    return (
      <MediaUploadPlaceholder
        id={id}
        selected={selected}
        fileName={fileName}
        mediaKind={kind === "video" ? "video" : "image"}
        upload={data.mediaUpload}
      />
    );
  }

  return (
    <div
      className={`group relative w-[240px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected
          ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25"
          : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/6 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-md"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {kind === "video" ? (
              <Film className="h-3 w-3" />
            ) : kind === "audio" ? (
              <Music className="h-3 w-3" />
            ) : (
              <ImageIcon className="h-3 w-3" />
            )}
          </span>
          <span className="truncate text-[11.5px] font-semibold text-white/90">
            {fileName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDeleteNode(id)}
          title="Delete node"
          className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Media preview */}
      <div className="p-2.5">
        {data.mediaUrl ? (
          kind === "video" ? (
            <div className="relative overflow-hidden rounded-[10px] bg-black/50">
              <video
                src={previewMediaUrl({ type: "media", data }) ?? data.mediaUrl}
                controls
                muted
                playsInline
                className="nodrag max-h-[168px] w-full object-contain"
              />
              <button
                type="button"
                onClick={() =>
                  onOpenLightbox({ url: data.mediaUrl!, kind: "video", title: fileName })
                }
                className="nodrag absolute top-1.5 right-1.5 cursor-pointer rounded-md bg-black/65 p-1 text-white/85 transition hover:bg-black"
                title="Expand preview"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          ) : kind === "audio" ? (
            <div className="rounded-[10px] border border-amber-400/20 bg-amber-500/8 p-2.5">
              <audio
                src={data.mediaUrl}
                controls
                className="nodrag h-8 w-full"
              />
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[10px] bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.mediaUrl}
                alt={fileName}
                className="max-h-[180px] w-full object-contain"
              />
              <button
                type="button"
                onClick={() =>
                  onOpenLightbox({ url: data.mediaUrl!, kind: "image", title: fileName })
                }
                className="nodrag absolute top-1.5 right-1.5 cursor-pointer rounded-md bg-black/65 p-1 text-white/85 opacity-0 transition group-hover:opacity-100 hover:bg-black"
                title="Expand preview"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          )
        ) : (
          <div className="grid h-24 place-items-center rounded-[10px] border border-dashed border-white/15 text-xs text-white/45">
            No media
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-[10.5px] text-white/50">
          <span className="uppercase tracking-wider">{kind}</span>
          <span className="flex items-center gap-1 font-medium" style={{ color }}>
            Output
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          </span>
        </div>
      </div>

      {/* Typed output handle */}
      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          backgroundColor: color,
          border: "2px solid #0b0e13",
        }}
      />
    </div>
  );
}
