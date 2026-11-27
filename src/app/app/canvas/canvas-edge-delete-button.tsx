"use client";

// Delete button on a selected canvas connection. The wire keeps the built-in bezier stroke.

import type { MouseEvent, PointerEvent } from "react";
import {
  BezierEdge,
  EdgeToolbar,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/presentation/components/i18n-provider";

// Selected wires show the button. A locked wire keeps that button disabled.
export function connectionDeleteControl(edge: {
  selected?: boolean;
  deletable?: boolean;
}): "hidden" | "ready" | "locked" {
  if (!edge.selected) return "hidden";
  return edge.deletable === false ? "locked" : "ready";
}

export function CanvasEdgeDeleteButton({
  isZh,
  disabled,
  onDelete,
}: {
  isZh: boolean;
  disabled: boolean;
  onDelete: () => void;
}) {
  const label = disabled
    ? isZh
      ? "無法刪除連線"
      : "Cannot delete this connection"
    : isZh
      ? "刪除連線"
      : "Delete connection";

  const keepPointer = (event: PointerEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <button
      type="button"
      data-canvas-edge-delete=""
      title={label}
      aria-label={label}
      disabled={disabled}
      onPointerDown={keepPointer}
      onMouseDown={keepPointer}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) return;
        onDelete();
      }}
      className={`nodrag nopan grid h-7 w-7 place-items-center rounded-full border shadow-lg backdrop-blur-md transition ${
        disabled
          ? "cursor-not-allowed border-white/10 bg-[#12161f]/80 text-white/30"
          : "cursor-pointer border-white/15 bg-[#12161f]/95 text-white/80 hover:border-rose-400/70 hover:bg-rose-500/20 hover:text-rose-200"
      }`}
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

// Same curve and style as the default edge, with the delete control at the midpoint.
export function CanvasSelectableEdge(props: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const { locale } = useI18n();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const control = connectionDeleteControl(props);
  const [, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    curvature: edgeCurvature(props.pathOptions),
  });

  return (
    <>
      <BezierEdge
        id={props.id}
        sourceX={props.sourceX}
        sourceY={props.sourceY}
        targetX={props.targetX}
        targetY={props.targetY}
        sourcePosition={props.sourcePosition}
        targetPosition={props.targetPosition}
        label={props.label}
        labelStyle={props.labelStyle}
        labelShowBg={props.labelShowBg}
        labelBgStyle={props.labelBgStyle}
        labelBgPadding={props.labelBgPadding}
        labelBgBorderRadius={props.labelBgBorderRadius}
        style={props.style}
        markerEnd={props.markerEnd}
        markerStart={props.markerStart}
        pathOptions={props.pathOptions}
        interactionWidth={props.interactionWidth}
      />
      {control === "hidden" ? null : (
        <EdgeToolbar edgeId={props.id} x={labelX} y={labelY} isVisible className="nodrag nopan">
          <CanvasEdgeDeleteButton
            isZh={isZh}
            disabled={control === "locked"}
            onDelete={() => {
              void deleteElements({ edges: [{ id: props.id }] });
            }}
          />
        </EdgeToolbar>
      )}
    </>
  );
}

export const CANVAS_EDGE_TYPES = { default: CanvasSelectableEdge };

// Edges can be selected. Node selection stays on the React Flow default.
export const CANVAS_DEFAULT_EDGE_OPTIONS = { selectable: true };

function edgeCurvature(pathOptions: EdgeProps["pathOptions"]): number | undefined {
  if (!pathOptions || typeof pathOptions !== "object" || !("curvature" in pathOptions)) return undefined;
  const curvature = pathOptions.curvature;
  return typeof curvature === "number" ? curvature : undefined;
}
