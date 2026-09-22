"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { Canvas, IText, PencilBrush, type FabricObject, type Point } from "fabric";

export type AnnotationTool = "draw" | "select" | "text";

// Imperative API for the toolbar (delete/clear) and the submit step (export).
export type AnnotationEditorHandle = {
  deleteSelected: () => void;
  clear: () => void;
  isEmpty: () => boolean;
  // Transparent PNG of every object at the intrinsic `width × height`; null when empty.
  toDataURL: () => string | null;
};

// Single annotation colour. The image prompt names this exact colour so the
// model can tell the director's markings apart from the artwork — keep in
// sync with `ANNOTATION_COLOR_NAME` in `frame-prompts.ts`.
export const ANNOTATION_COLOR = "#ff4d2e";
// Brush width / text size in CSS px as seen on screen (scaled into scene units).
const STROKE_CSS = 6;
const TEXT_SIZE_CSS = 28;
const TEXT_PLACEHOLDER = "備註";
const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, 'PingFang TC', 'Noto Sans TC', sans-serif";
// A double-click in draw mode leaves two tiny dot strokes; drop those created
// within this window before placing the text.
const DOT_CLEANUP_MS = 700;

// Selection handles styled to the app palette (paper corners, ink stroke, accent border).
function styleControls(object: FabricObject) {
  object.set({
    transparentCorners: false,
    cornerColor: "#fffbf5",
    cornerStrokeColor: "#12141c",
    cornerStyle: "circle",
    cornerSize: 12,
    touchCornerSize: 28,
    borderColor: "#12141c",
    borderScaleFactor: 2,
    padding: 6,
  });
}

// Object-based annotation layer (Fabric.js) meant to sit on top of an image.
// Scene coordinates equal the image's intrinsic `width × height`, so the
// exported PNG lines up 1:1 with the picture; the view is zoomed to fit the box.
// Every stroke and text is a selectable object: move, scale, rotate, delete.
// Double-clicking anywhere (while drawing or selecting) drops a text remark.
export function AnnotationEditor({
  editorRef,
  width,
  height,
  tool,
  className = "",
  onChange,
  onSelectionChange,
  onToolChange,
}: {
  // Plain prop (not React's `ref`) so it survives `next/dynamic`.
  editorRef?: Ref<AnnotationEditorHandle>;
  width: number;
  height: number;
  tool: AnnotationTool;
  className?: string;
  // Object count after add/remove/clear.
  onChange?: (objectCount: number) => void;
  // Number of currently selected objects.
  onSelectionChange?: (selectedCount: number) => void;
  // Editor asks to switch tools (e.g. back to "select" after the text tool places text).
  onToolChange?: (tool: AnnotationTool) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const zoomRef = useRef(1);

  // Latest props/callbacks for event handlers bound once at mount.
  const toolRef = useRef(tool);
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onToolChangeRef = useRef(onToolChange);
  useEffect(() => {
    toolRef.current = tool;
    onChangeRef.current = onChange;
    onSelectionChangeRef.current = onSelectionChange;
    onToolChangeRef.current = onToolChange;
  });

  // Zoom the scene so `width` scene units fill the host box; keep brush in CSS px.
  function fit() {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const rect = host.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const zoom = rect.width / width;
    zoomRef.current = zoom;
    canvas.setDimensions({ width: rect.width, height: rect.height });
    canvas.setZoom(zoom);
    if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.width = STROKE_CSS / zoom;
    canvas.requestRenderAll();
  }

  // Mount Fabric once; rebuild only if the host element changes.
  useEffect(() => {
    const el = canvasElRef.current;
    const host = hostRef.current;
    if (!el || !host) return;

    const canvas = new Canvas(el, {
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: false,
      // Unified mouse / touch / stylus handling.
      enablePointerEvents: true,
    });
    canvasRef.current = canvas;

    const brush = new PencilBrush(canvas);
    brush.color = ANNOTATION_COLOR;
    brush.decimate = 2;
    canvas.freeDrawingBrush = brush;

    // Tiny "dot" strokes left by clicks, with creation time (see DOT_CLEANUP_MS).
    const recentDots: Array<{ path: FabricObject; at: number }> = [];

    const emitCount = () => onChangeRef.current?.(canvas.getObjects().length);
    const emitSelection = () =>
      onSelectionChangeRef.current?.(canvas.getActiveObjects().length);

    // Drop an editable text remark at a scene point and start typing.
    function addText(point: Point) {
      const zoom = zoomRef.current;
      const text = new IText(TEXT_PLACEHOLDER, {
        left: point.x,
        top: point.y,
        fontSize: TEXT_SIZE_CSS / zoom,
        fontFamily: FONT_FAMILY,
        fontWeight: "700",
        fill: ANNOTATION_COLOR,
        editable: true,
      });
      styleControls(text);
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      canvas.requestRenderAll();
    }

    canvas.on("object:added", emitCount);
    canvas.on("object:removed", emitCount);
    canvas.on("selection:created", emitSelection);
    canvas.on("selection:updated", emitSelection);
    canvas.on("selection:cleared", emitSelection);

    // Freshly drawn strokes become regular selectable objects.
    canvas.on("path:created", ({ path }) => {
      path.set({ strokeUniform: true });
      styleControls(path);
      const dotLimit = path.strokeWidth * 2;
      if (path.getScaledWidth() < dotLimit && path.getScaledHeight() < dotLimit) {
        recentDots.push({ path, at: Date.now() });
      }
    });

    // Text tool: single click on empty canvas drops a text box, then hand
    // control back to "select" so the next click manipulates objects.
    canvas.on("mouse:down", ({ target, scenePoint }) => {
      if (toolRef.current !== "text" || target) return;
      addText(scenePoint);
      onToolChangeRef.current?.("select");
    });

    // Double-click while drawing/selecting: add a text remark right there.
    // Stays in the current tool so the director can keep sketching.
    canvas.on("mouse:dblclick", ({ target, scenePoint }) => {
      if (toolRef.current === "text") return; // single click already handled it
      if (target instanceof IText) return; // Fabric enters editing on its own
      const now = Date.now();
      for (const dot of recentDots) {
        if (now - dot.at <= DOT_CLEANUP_MS) canvas.remove(dot.path);
      }
      recentDots.length = 0;
      addText(scenePoint);
    });

    // Drop text boxes that end up empty.
    canvas.on("text:editing:exited", ({ target }) => {
      if (target.text.trim() === "") {
        canvas.remove(target);
        canvas.requestRenderAll();
      }
    });

    // Keyboard: Delete/Backspace removes selection, Esc deselects / exits text
    // editing. Capture phase so this runs before the dialog's own Esc handler.
    function onKeyDown(event: KeyboardEvent) {
      const active = canvas.getActiveObject();
      const editing = active instanceof IText && active.isEditing;
      if (event.key === "Escape") {
        if (editing) {
          active.exitEditing();
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          event.stopImmediatePropagation();
        } else if (active) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          event.stopImmediatePropagation();
        }
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (editing) return; // let the text editor handle it
        const targetEl = event.target as HTMLElement | null;
        if (targetEl && /^(INPUT|TEXTAREA)$/.test(targetEl.tagName)) return;
        const selected = canvas.getActiveObjects();
        if (selected.length === 0) return;
        event.preventDefault();
        canvas.discardActiveObject();
        canvas.remove(...selected);
        canvas.requestRenderAll();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);

    const observer = new ResizeObserver(() => fit());
    observer.observe(host);
    fit();

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown, true);
      canvasRef.current = null;
      void canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New intrinsic size (image loaded) → objects drawn before are misaligned; reset.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.remove(...canvas.getObjects());
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // Tool → drawing mode / selection behaviour / cursors.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.isDrawingMode = tool === "draw";
    canvas.selection = tool === "select";
    canvas.defaultCursor = tool === "text" ? "text" : "default";
    canvas.hoverCursor = tool === "select" ? "move" : tool === "text" ? "text" : "crosshair";
    if (tool !== "select") {
      const active = canvas.getActiveObject();
      if (active instanceof IText && active.isEditing) active.exitEditing();
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
  }, [tool]);

  useImperativeHandle(
    editorRef,
    () => ({
      deleteSelected: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const selected = canvas.getActiveObjects();
        if (selected.length === 0) return;
        canvas.discardActiveObject();
        canvas.remove(...selected);
        canvas.requestRenderAll();
      },
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.discardActiveObject();
        canvas.remove(...canvas.getObjects());
        canvas.requestRenderAll();
      },
      isEmpty: () => (canvasRef.current?.getObjects().length ?? 0) === 0,
      toDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas || canvas.getObjects().length === 0) return null;
        const active = canvas.getActiveObject();
        if (active instanceof IText && active.isEditing) active.exitEditing();
        canvas.discardActiveObject();
        canvas.renderAll();
        // Display px × multiplier = intrinsic px, ignoring devicePixelRatio.
        return canvas.toDataURL({
          format: "png",
          multiplier: width / canvas.getWidth(),
          enableRetinaScaling: false,
        });
      },
    }),
    [width],
  );

  return (
    <div
      ref={hostRef}
      className={`touch-none select-none ${className}`}
      aria-label="標註圖層"
    >
      <canvas ref={canvasElRef} />
    </div>
  );
}
