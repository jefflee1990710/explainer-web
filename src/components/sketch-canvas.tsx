"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";

export type SketchTool = "pen" | "eraser";

// Imperative API exposed to the parent (toolbar buttons, export on submit).
export type SketchCanvasHandle = {
  undo: () => void;
  clear: () => void;
  isEmpty: () => boolean;
  // Transparent PNG of the strokes only; null when nothing was drawn.
  toDataURL: () => string | null;
};

type Point = { x: number; y: number };
type Stroke = {
  tool: SketchTool;
  color: string;
  // Line width in canvas pixels (already scaled from CSS px).
  size: number;
  points: Point[];
};

// Transparent freehand drawing layer meant to sit on top of an image.
// `width`/`height` are the intrinsic canvas size (use the image's natural
// size so the exported PNG lines up 1:1); CSS stretches it to fit the box.
export function SketchCanvas({
  ref,
  width,
  height,
  tool,
  color,
  size,
  disabled = false,
  className = "",
  onChange,
}: {
  ref?: Ref<SketchCanvasHandle>;
  width: number;
  height: number;
  tool: SketchTool;
  color: string;
  // Brush size in CSS pixels as seen on screen.
  size: number;
  disabled?: boolean;
  className?: string;
  // Fired after every finished stroke / undo / clear with the stroke count.
  onChange?: (strokeCount: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeRef = useRef<Stroke | null>(null);

  const applyStyle = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalCompositeOperation =
      stroke.tool === "eraser" ? "destination-out" : "source-over";
  }, []);

  // Draw one full stroke (used when replaying after undo/clear).
  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      if (stroke.points.length === 0) return;
      applyStyle(ctx, stroke);
      if (stroke.points.length === 1) {
        const [p] = stroke.points;
        ctx.beginPath();
        ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    },
    [applyStyle],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) drawStroke(ctx, stroke);
  }, [drawStroke]);

  // Intrinsic size change (new image) resets the layer.
  useEffect(() => {
    strokesRef.current = [];
    activeRef.current = null;
    redraw();
    onChange?.(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        strokesRef.current.pop();
        redraw();
        onChange?.(strokesRef.current.length);
      },
      clear: () => {
        strokesRef.current = [];
        redraw();
        onChange?.(0);
      },
      isEmpty: () => strokesRef.current.length === 0,
      toDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas || strokesRef.current.length === 0) return null;
        return canvas.toDataURL("image/png");
      },
    }),
    [redraw, onChange],
  );

  // Map a pointer event to canvas pixel coordinates (CSS box → intrinsic size).
  function toCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      point: {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      },
      scale: scaleX,
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    // Keep receiving moves when the pointer leaves the canvas mid-stroke.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Stale pointer id (e.g. synthetic events); drawing still works.
    }
    const { point, scale } = toCanvasPoint(event);
    const stroke: Stroke = {
      tool,
      color,
      // Eraser is deliberately wider so it feels forgiving.
      size: (tool === "eraser" ? size * 2.5 : size) * scale,
      points: [point],
    };
    activeRef.current = stroke;
    const ctx = event.currentTarget.getContext("2d");
    if (ctx) drawStroke(ctx, stroke);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = activeRef.current;
    if (!stroke) return;
    event.preventDefault();
    const { point } = toCanvasPoint(event);
    const last = stroke.points[stroke.points.length - 1];
    stroke.points.push(point);
    // Incremental segment instead of a full replay keeps drawing smooth.
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    applyStyle(ctx, stroke);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function finishStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = activeRef.current;
    if (!stroke) return;
    activeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    strokesRef.current.push(stroke);
    onChange?.(strokesRef.current.length);
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label="手繪標註圖層"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
      className={`touch-none select-none ${disabled ? "cursor-not-allowed" : "cursor-crosshair"} ${className}`}
    />
  );
}
