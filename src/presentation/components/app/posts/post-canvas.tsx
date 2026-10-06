"use client";

import { useRef } from "react";
import { POSTER_CANVAS, POSTER_FILLS, type PosterLayer, type PosterShapeLayer, type PosterTextLayer } from "@/model/post-layers";

type Corner = "nw" | "ne" | "sw" | "se";

type Drag =
  | {
      kind: "move";
      id: string;
      pointerX: number;
      pointerY: number;
      layer: PosterLayer;
    }
  | {
      kind: "scale";
      id: string;
      corner: Corner;
      pointerX: number;
      pointerY: number;
      layer: PosterLayer;
    };

// Organic corner used by layout 13, fitted to the layer box.
function blobPath(w: number, h: number) {
  return `M ${w * 0.15} ${h * 0.45} C ${w * 0.02} ${h * 0.18}, ${w * 0.4} ${h * 0.02}, ${w * 0.68} ${h * 0.16} C ${w * 0.98} ${h * 0.32}, ${w} ${h * 0.62}, ${w * 0.74} ${h * 0.86} C ${w * 0.48} ${h * 1.02}, ${w * 0.12} ${h * 0.82}, ${w * 0.15} ${h * 0.45} Z`;
}

function quarterPath(w: number, h: number, corner: PosterShapeLayer["corner"]) {
  if (corner === "br") return `M ${w} 0 A ${w} ${h} 0 0 0 0 ${h} L ${w} ${h} Z`;
  if (corner === "bl") return `M 0 0 A ${w} ${h} 0 0 1 ${w} ${h} L 0 ${h} Z`;
  if (corner === "tr") return `M 0 0 A ${w} ${h} 0 0 1 ${w} ${h} L ${w} 0 Z`;
  return `M ${w} 0 A ${w} ${h} 0 0 0 0 ${h} L 0 0 Z`;
}

function domePath(w: number, h: number, side: PosterShapeLayer["side"]) {
  if (side === "bottom") return `M 0 0 A ${w / 2} ${h} 0 0 0 ${w} 0 Z`;
  if (side === "left") return `M ${w} 0 A ${w} ${h / 2} 0 0 0 ${w} ${h} Z`;
  if (side === "right") return `M 0 0 A ${w} ${h / 2} 0 0 1 0 ${h} Z`;
  return `M 0 ${h} A ${w / 2} ${h} 0 0 1 ${w} ${h} Z`;
}

function ShapeGraphic({ layer }: { layer: PosterShapeLayer }) {
  const { w, h, fill, shape } = layer;
  if (shape === "rect") return <rect width={w} height={h} fill={fill} />;
  if (shape === "circle" || shape === "ellipse") {
    return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={fill} />;
  }
  if (shape === "triangle") return <polygon points={`${w / 2},0 ${w},${h} 0,${h}`} fill={fill} />;
  if (shape === "quarterCircle") return <path d={quarterPath(w, h, layer.corner)} fill={fill} />;
  if (shape === "semicircle") return <path d={domePath(w, h, layer.side)} fill={fill} />;
  if (shape === "blob") return <path d={blobPath(w, h)} fill={fill} />;
  const vertical = layer.axis === "vertical";
  const count = Math.max(4, Math.round((vertical ? w : h) / 36));
  const lines = Array.from({ length: count }, (_, index) => {
    const t = (index + 0.5) / count;
    if (vertical) {
      const x = t * w;
      return <line key={index} x1={x} y1={0} x2={x} y2={h} stroke={fill} strokeWidth={8} />;
    }
    const y = t * h;
    return <line key={index} x1={0} y1={y} x2={w} y2={y} stroke={fill} strokeWidth={8} />;
  });
  return <g>{lines}</g>;
}

function TextGraphic({ layer }: { layer: PosterTextLayer }) {
  const anchor = layer.align === "center" ? "middle" : layer.align === "right" ? "end" : "start";
  const x = layer.align === "center" ? layer.w / 2 : layer.align === "right" ? layer.w : 0;
  return (
    <text
      x={layer.vertical ? layer.w / 2 : x}
      y={layer.vertical ? 0 : layer.h * 0.8}
      fill={layer.color}
      fontSize={layer.fontSize}
      fontWeight={layer.fontWeight}
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      textAnchor={layer.vertical ? "middle" : anchor}
      letterSpacing={layer.tracking}
      writingMode={layer.vertical ? "tb" : undefined}
    >
      {layer.text}
    </text>
  );
}

function unitsPerPixel(svg: SVGSVGElement | null) {
  const rect = svg?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) {
    return { x: 1, y: 1 };
  }
  return { x: POSTER_CANVAS.width / rect.width, y: POSTER_CANVAS.height / rect.height };
}

function applyScale(layer: PosterLayer, corner: Corner, dx: number, dy: number): PosterLayer {
  let x = layer.x;
  let y = layer.y;
  let w = layer.w;
  let h = layer.h;
  if (corner === "se") {
    w += dx;
    h += dy;
  } else if (corner === "nw") {
    x += dx;
    y += dy;
    w -= dx;
    h -= dy;
  } else if (corner === "ne") {
    y += dy;
    w += dx;
    h -= dy;
  } else {
    x += dx;
    w -= dx;
    h += dy;
  }
  const fontSize =
    layer.type === "text" ? Math.max(12, Math.round(layer.fontSize * (h / layer.h))) : undefined;
  return { ...layer, x, y, w: Math.max(48, w), h: Math.max(48, h), ...(fontSize ? { fontSize } : {}) };
}

// Editable poster. The model preview is not drawn here.
export function PostCanvas({
  layers,
  selectedId,
  label,
  onSelect,
  onChange,
  svgRef,
}: {
  layers: PosterLayer[];
  selectedId: string | null;
  label: string;
  onSelect: (id: string) => void;
  onChange: (layers: PosterLayer[]) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const drag = useRef<Drag | null>(null);

  function update(next: PosterLayer) {
    onChange(layers.map((layer) => (layer.id === next.id ? next : layer)));
  }

  function onPointerMove(event: React.PointerEvent) {
    const current = drag.current;
    if (!current) return;
    const scale = unitsPerPixel(svgRef.current);
    const dx = (event.clientX - current.pointerX) * scale.x;
    const dy = (event.clientY - current.pointerY) * scale.y;
    if (current.kind === "move") {
      update({ ...current.layer, x: current.layer.x + dx, y: current.layer.y + dy });
      return;
    }
    update(applyScale(current.layer, current.corner, dx, dy));
  }

  const selected = layers.find((layer) => layer.id === selectedId);

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${POSTER_CANVAS.width} ${POSTER_CANVAS.height}`}
        width={POSTER_CANVAS.width}
        height={POSTER_CANVAS.height}
        role="group"
        aria-label={label}
        className="h-auto w-full touch-none overflow-hidden bg-white shadow-[0_0_0_1px_var(--studio-line)]"
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <rect width={POSTER_CANVAS.width} height={POSTER_CANVAS.height} fill={POSTER_FILLS.canvas} />
        {layers.map((layer) => {
          const active = layer.id === selectedId;
          return (
            <g
              key={layer.id}
              transform={`translate(${layer.x} ${layer.y})`}
              tabIndex={0}
              role="button"
              aria-label={layer.type === "text" ? layer.text || layer.role : layer.shape}
              aria-pressed={active}
              className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)]"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                onSelect(layer.id);
                drag.current = {
                  kind: "move",
                  id: layer.id,
                  pointerX: event.clientX,
                  pointerY: event.clientY,
                  layer,
                };
              }}
              onPointerMove={onPointerMove}
              onPointerUp={() => {
                drag.current = null;
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 40 : 10;
                const delta =
                  event.key === "ArrowLeft"
                    ? { x: -step, y: 0 }
                    : event.key === "ArrowRight"
                      ? { x: step, y: 0 }
                      : event.key === "ArrowUp"
                        ? { x: 0, y: -step }
                        : event.key === "ArrowDown"
                          ? { x: 0, y: step }
                          : null;
                if (!delta) return;
                event.preventDefault();
                onSelect(layer.id);
                update({ ...layer, x: layer.x + delta.x, y: layer.y + delta.y });
              }}
            >
              {layer.type === "shape" ? <ShapeGraphic layer={layer} /> : <TextGraphic layer={layer} />}
              {active ? (
                <rect
                  width={layer.w}
                  height={layer.h}
                  fill="none"
                  stroke="#12141c"
                  strokeWidth={4}
                  pointerEvents="none"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      {selected ? (
        <div className="pointer-events-none absolute inset-0">
          {(["nw", "ne", "sw", "se"] as Corner[]).map((corner) => {
            const left = ((corner === "nw" || corner === "sw" ? selected.x : selected.x + selected.w) / POSTER_CANVAS.width) * 100;
            const top = ((corner === "nw" || corner === "ne" ? selected.y : selected.y + selected.h) / POSTER_CANVAS.height) * 100;
            return (
              <button
                key={corner}
                type="button"
                aria-label={corner}
                className="pointer-events-auto absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-full border-2 border-[var(--studio-ink)] bg-white"
                style={{ left: `${left}%`, top: `${top}%` }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag.current = {
                    kind: "scale",
                    id: selected.id,
                    corner,
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    layer: selected,
                  };
                }}
                onPointerMove={onPointerMove}
                onPointerUp={() => {
                  drag.current = null;
                }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// Composite the current layers to a PNG. Used for save and download.
export async function rasterizePoster(svg: SVGSVGElement) {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = POSTER_CANVAS.width;
    canvas.height = POSTER_CANVAS.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.fillStyle = POSTER_FILLS.canvas;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("png");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
