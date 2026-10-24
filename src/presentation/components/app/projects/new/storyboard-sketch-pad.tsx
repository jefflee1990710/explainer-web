"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { AspectRatio } from "@/model/project";
import type {
  AnnotationEditorHandle,
  AnnotationTool,
} from "@/presentation/components/annotation-editor";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

const AnnotationEditor = dynamic(
  () =>
    import("@/presentation/components/annotation-editor").then(
      (mod) => mod.AnnotationEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center text-accent-ink/40">
        <Spinner className="h-5 w-5" />
      </div>
    ),
  },
);

// Derive intrinsic canvas dimensions and layout class from the chosen video aspect ratio.
function sketchDimensions(aspectRatio: AspectRatio): {
  width: number;
  height: number;
  boxClass: string;
} {
  if (aspectRatio === "9:16") {
    return {
      width: 540,
      height: 960,
      boxClass: "aspect-[9/16] mx-auto w-full max-w-[280px]",
    };
  }
  if (aspectRatio === "1:1") {
    return {
      width: 720,
      height: 720,
      boxClass: "aspect-square mx-auto w-full max-w-[380px]",
    };
  }
  return {
    width: 960,
    height: 540,
    boxClass: "aspect-video w-full",
  };
}

// Interactive whiteboard sketchpad for drawing a storyboard clip layout and text annotations.
export function StoryboardSketchPad({
  clipNumber,
  aspectRatio = "16:9",
  sketchUrl,
  disabled,
  onSketchChange,
}: {
  clipNumber: number;
  aspectRatio?: AspectRatio;
  sketchUrl?: string;
  disabled?: boolean;
  onSketchChange: (dataUrl: string | undefined) => void;
}) {
  const { t } = useI18n();
  const editorRef = useRef<AnnotationEditorHandle>(null);
  const [tool, setTool] = useState<AnnotationTool>("draw");
  const [objectCount, setObjectCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const { width, height, boxClass } = sketchDimensions(aspectRatio);

  // Sync the drawn PNG data URL back to the parent draft whenever strokes or text change.
  function syncCanvas(nextCount: number) {
    setObjectCount(nextCount);
    window.requestAnimationFrame(() => {
      const dataUrl = editorRef.current?.toDataURL() || undefined;
      onSketchChange(dataUrl);
    });
  }

  function handleClear() {
    editorRef.current?.clear();
    setObjectCount(0);
    setSelectedCount(0);
    onSketchChange(undefined);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-foreground">
              {t("brief.drafts.sketchLabel", { n: clipNumber })}
            </p>
            <span className="rounded-full border border-accent-ink/15 bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-muted">
              {aspectRatio}
            </span>
          </div>
          <p className="text-[11px] text-muted">
            {t("brief.drafts.sketchHint", { n: clipNumber })}
          </p>
        </div>

        {/* Drawing toolbar: Draw, Text, Select, Delete, Clear */}
        <div className="flex flex-wrap items-center gap-1">
          <div className="inline-flex rounded-full border border-accent-ink/15 bg-paper p-0.5">
            {(["draw", "text", "select"] as const).map((item) => {
              const active = tool === item;
              const label =
                item === "draw"
                  ? t("brief.drafts.toolDraw")
                  : item === "text"
                    ? t("brief.drafts.toolText")
                    : t("brief.drafts.toolSelect");
              return (
                <button
                  key={item}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTool(item)}
                  className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "bg-accent-ink text-lime"
                      : "text-muted hover:text-foreground"
                  } disabled:opacity-50`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {selectedCount > 0 ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => editorRef.current?.deleteSelected()}
              className="cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:border-accent-ink/40 hover:text-foreground"
            >
              {t("brief.drafts.toolDelete")}
            </button>
          ) : null}

          {objectCount > 0 || sketchUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClear}
              className="cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:border-accent/50 hover:text-accent"
            >
              {t("brief.drafts.toolClear")}
            </button>
          ) : null}
        </div>
      </div>

      {/* Whiteboard canvas with subtle dot grid matching the chosen video aspect ratio */}
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed border-accent-ink/20 bg-[#fffdf8] shadow-inner ${boxClass}`}
        style={{
          backgroundImage:
            "radial-gradient(rgba(18, 20, 28, 0.12) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        {sketchUrl && objectCount === 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sketchUrl}
            alt={`Clip ${clipNumber} sketch`}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        ) : null}
        <AnnotationEditor
          editorRef={editorRef}
          width={width}
          height={height}
          tool={tool}
          className="absolute inset-0 h-full w-full"
          onChange={syncCanvas}
          onSelectionChange={setSelectedCount}
          onToolChange={setTool}
        />
      </div>
    </div>
  );
}
