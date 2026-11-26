import {
  Download,
  Maximize2,
} from "lucide-react";
import { CanvasDownloadButton } from "@/app/app/canvas/canvas-download-button";
import {
  OutdatedPreviewTag,
  PreviousResultTag,
} from "@/app/app/canvas/nodes/outdated-notice";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";

export function ModelNodeCardPreview(view: ModelNodeCardView) {
  const { data, projectTitle, onOpenLightbox, isZh, spec, displayName, isBusy, outdated } = view;
  return (
    <>
  {/* Inline Output Preview */}
  {data.outputUrl && (data.outputKind ?? spec.output.type) !== "text" ? (
    <div
      className={`relative overflow-hidden rounded-[10px] border bg-black/50 ${
        outdated ? "border-amber-400/40 opacity-70" : "border-white/10"
      }`}
    >
      {outdated ? <OutdatedPreviewTag isZh={isZh} /> : null}
      {isBusy && data.outputUrl ? <PreviousResultTag isZh={isZh} /> : null}
      {(data.outputKind ?? spec.output.type) === "video" ? (
        <video
          key={data.outputUrl}
          src={data.outputUrl}
          controls
          playsInline
          className="nodrag max-h-[190px] w-full object-contain"
        />
      ) : (data.outputKind ?? spec.output.type) === "audio" ? (
        <div className="bg-amber-500/8 p-2.5 pr-16">
          <audio key={data.outputUrl} src={data.outputUrl} controls className="nodrag h-8 w-full" />
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={data.outputUrl}
          alt={displayName}
          className="max-h-[200px] w-full object-cover"
        />
      )}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() =>
            onOpenLightbox({
              url: data.outputUrl!,
              kind:
                (data.outputKind ?? spec.output.type) === "audio"
                  ? "audio"
                  : (data.outputKind ?? spec.output.type) === "video"
                    ? "video"
                    : "image",
              title: displayName,
            })
          }
          className="nodrag cursor-pointer rounded-md bg-black/70 p-1.5 text-white/90 transition hover:bg-black"
          title={isZh ? "放大預覽" : "Expand"}
        >
          <Maximize2 className="h-3 w-3" />
        </button>
        <CanvasDownloadButton
          url={data.outputUrl}
          project={projectTitle}
          title={displayName}
          kind={
            (data.outputKind ?? spec.output.type) === "audio"
              ? "audio"
              : (data.outputKind ?? spec.output.type) === "video"
                ? "video"
                : "image"
          }
          className="rounded-md bg-black/70 p-1.5 text-white/90 transition hover:bg-black"
        >
          <Download className="h-3 w-3" />
        </CanvasDownloadButton>
      </div>
    </div>
  ) : null}
    </>
  );
}
