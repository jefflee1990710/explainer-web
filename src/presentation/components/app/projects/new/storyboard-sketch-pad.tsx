"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { AspectRatio, StoryboardSketchElement } from "@/model/project";
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
      boxClass: "aspect-[9/16] mx-auto w-full max-w-[220px]",
    };
  }
  if (aspectRatio === "1:1") {
    return {
      width: 720,
      height: 720,
      boxClass: "aspect-square mx-auto w-full max-w-[280px]",
    };
  }
  return {
    width: 960,
    height: 540,
    boxClass: "aspect-video w-full",
  };
}

// Interactive whiteboard sketchpad for drawing a storyboard clip layout, dropping 1-click diagram stamps, and placing text annotations.
export function StoryboardSketchPad({
  clipNumber,
  aspectRatio = "16:9",
  sketchUrl,
  sketchElements,
  disabled,
  onSketchChange,
  onAutoLayoutRequest,
}: {
  clipNumber: number;
  aspectRatio?: AspectRatio;
  sketchUrl?: string;
  sketchElements?: StoryboardSketchElement[];
  disabled?: boolean;
  onSketchChange: (dataUrl: string | undefined) => void;
  onAutoLayoutRequest?: () => void;
}) {
  const { t } = useI18n();
  const editorRef = useRef<AnnotationEditorHandle>(null);
  const [tool, setTool] = useState<AnnotationTool>("draw");
  const [objectCount, setObjectCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const lastElementsJsonRef = useRef<string>("");
  const { width, height, boxClass } = sketchDimensions(aspectRatio);

  // Sync the drawn PNG data URL back to the parent draft whenever strokes, stamps, or text change.
  function syncCanvas(nextCount: number) {
    setObjectCount(nextCount);
    window.requestAnimationFrame(() => {
      const dataUrl = editorRef.current?.toDataURL() || undefined;
      onSketchChange(dataUrl);
    });
  }

  // When `sketchElements` are updated by AI Auto-Draft or a layout preset button, render them onto the canvas.
  useEffect(() => {
    const serialized = JSON.stringify(sketchElements ?? []);
    if (!sketchElements || sketchElements.length === 0) {
      lastElementsJsonRef.current = serialized;
      return;
    }
    if (serialized === lastElementsJsonRef.current) return;
    lastElementsJsonRef.current = serialized;

    const timer = window.setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.loadSketchElements(sketchElements);
        setTool("select");
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [sketchElements]);

  function handleClear() {
    editorRef.current?.clear();
    lastElementsJsonRef.current = "[]";
    setObjectCount(0);
    setSelectedCount(0);
    onSketchChange(undefined);
  }

  function handleAddStamp(element: StoryboardSketchElement) {
    if (disabled) return;
    setTool("select");
    editorRef.current?.addStamp(element);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-foreground">
              {t("brief.drafts.sketchLabel", { n: clipNumber })}
            </p>
            <span className="rounded-full border border-accent-ink/15 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-muted">
              {aspectRatio}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {selectedCount > 0 ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => editorRef.current?.deleteSelected()}
                className="cursor-pointer rounded-full border border-accent-ink/15 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-muted transition hover:border-accent-ink/40 hover:text-foreground"
              >
                {t("brief.drafts.toolDelete")}
              </button>
            ) : null}

            {objectCount > 0 || sketchUrl ? (
              <button
                type="button"
                disabled={disabled}
                onClick={handleClear}
                className="cursor-pointer rounded-full border border-accent-ink/15 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-muted transition hover:border-accent/50 hover:text-accent"
              >
                {t("brief.drafts.toolClear")}
              </button>
            ) : null}
          </div>
        </div>

        {/* Segmented drawing tool selector */}
        <div className="grid grid-cols-3 rounded-xl border border-accent-ink/15 bg-white p-0.5">
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
                className={`cursor-pointer rounded-lg px-2 py-1 text-center text-[11px] font-semibold transition ${
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

      {/* Compact 3-Column Stamp Grid & Auto-Layout Button */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              handleAddStamp({
                type: "person",
                x: 10,
                y: 42,
                width: 20,
                height: 42,
                label: "Host",
                color: "#ff4d2e",
              })
            }
            className="cursor-pointer truncate rounded-xl border border-accent-ink/15 bg-white px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-accent-ink hover:bg-lime/25 disabled:opacity-50"
          >
            {t("brief.drafts.stampPerson")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              handleAddStamp({
                type: "rect",
                x: 36,
                y: 28,
                width: 26,
                height: 24,
                label: "Step / Box",
                color: "#2563eb",
              })
            }
            className="cursor-pointer truncate rounded-xl border border-accent-ink/15 bg-white px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-accent-ink hover:bg-lime/25 disabled:opacity-50"
          >
            {t("brief.drafts.stampBox")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              handleAddStamp({
                type: "circle",
                x: 42,
                y: 30,
                width: 20,
                height: 20,
                label: "Icon",
                color: "#059669",
              })
            }
            className="cursor-pointer truncate rounded-xl border border-accent-ink/15 bg-white px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-accent-ink hover:bg-lime/25 disabled:opacity-50"
          >
            {t("brief.drafts.stampCircle")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              handleAddStamp({
                type: "arrow",
                x: 32,
                y: 46,
                x2: 64,
                y2: 46,
                color: "#ff4d2e",
              })
            }
            className="cursor-pointer truncate rounded-xl border border-accent-ink/15 bg-white px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-accent-ink hover:bg-lime/25 disabled:opacity-50"
          >
            {t("brief.drafts.stampArrow")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              handleAddStamp({
                type: "line",
                x: 50,
                y: 12,
                x2: 50,
                y2: 88,
                color: "#12141c",
              })
            }
            className="cursor-pointer truncate rounded-xl border border-accent-ink/15 bg-white px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-accent-ink hover:bg-lime/25 disabled:opacity-50"
          >
            {t("brief.drafts.stampDivider")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              handleAddStamp({
                type: "text",
                x: 28,
                y: 14,
                label: "「Hook Title」",
                color: "#12141c",
              })
            }
            className="cursor-pointer truncate rounded-xl border border-accent-ink/15 bg-white px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-accent-ink hover:bg-lime/25 disabled:opacity-50"
          >
            {t("brief.drafts.stampTitle")}
          </button>
        </div>

        {onAutoLayoutRequest ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onAutoLayoutRequest}
            className="w-full cursor-pointer rounded-xl bg-accent-ink px-3 py-1.5 text-center text-[11px] font-bold text-lime transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {t("brief.drafts.applyTemplateToCanvas")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
