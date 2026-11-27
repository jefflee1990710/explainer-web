"use client";

// Command (Mac) or Control (Windows) drag on the pane draws a selection box.
// Plain left-drag is left to React Flow so the canvas still pans.

import { type Dispatch, type RefObject, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import {
  flowDeltaFromScreen,
  isCanvasPaneTarget,
  isModifierSelectionGesture,
  nodeSelectionBox,
  nodesInsideSelection,
  selectionPassedThreshold,
  selectionPlatformOf,
  selectionRectFromPoints,
  selectedMoveOrigins,
  translatePositions,
  withSelectedIds,
  type SelectableNodeBox,
} from "@/app/app/canvas/canvas-modifier-selection";

export type ModifierSelectionNode = {
  id: string;
  position: { x: number; y: number };
  selected?: boolean;
  hidden?: boolean;
  selectable?: boolean;
  draggable?: boolean;
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
};

type ScreenBox = { left: number; top: number; width: number; height: number };

type PointerLike = {
  button: number;
  clientX: number;
  clientY: number;
  metaKey: boolean;
  ctrlKey: boolean;
  pointerId?: number;
  pointerType?: string;
  target: EventTarget | null;
};

export function useCanvasModifierSelection<T extends ModifierSelectionNode>(params: {
  containerRef: RefObject<HTMLElement | null>;
  nodesRef: RefObject<T[]>;
  setNodes: Dispatch<SetStateAction<T[]>>;
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number };
  getZoom: () => number;
  lockedIds: ReadonlySet<string>;
  hiddenIds: ReadonlySet<string>;
  selectionKey: string;
  selectedCount: number;
  onMoveEnd: () => void;
}) {
  // Armed only for the selection that was current when Move was clicked.
  const [armedKey, setArmedKey] = useState<string | null>(null);
  const moveArmed = armedKey !== null && armedKey === params.selectionKey && params.selectedCount >= 2;
  const api = useRef({ ...params, moveArmed });
  const originsRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  const [selectionBox, setSelectionBox] = useState<ScreenBox | null>(null);

  useEffect(() => {
    api.current = { ...params, moveArmed };
  }, [params, moveArmed]);

  const beginMove = useCallback(() => {
    originsRef.current = selectedMoveOrigins(api.current.nodesRef.current, api.current.lockedIds);
  }, []);

  const updateMove = useCallback((dx: number, dy: number) => {
    const origins = originsRef.current;
    if (!origins || origins.size === 0) return;
    const delta = flowDeltaFromScreen(dx, dy, api.current.getZoom());
    api.current.setNodes((prev) => translatePositions(prev, origins, delta));
  }, []);

  const endMove = useCallback(
    (moved: boolean) => {
      const had = (originsRef.current?.size ?? 0) > 0;
      originsRef.current = null;
      if (moved && had) api.current.onMoveEnd();
    },
    [],
  );

  const toggleMove = useCallback(() => {
    setArmedKey((current) => (current === api.current.selectionKey ? null : api.current.selectionKey));
  }, []);

  useEffect(() => {
    const root = params.containerRef.current;
    if (!root) return;

    let drag: { kind: "select" | "move"; x: number; y: number; active: boolean } | null = null;
    let swallowClick = false;

    const boxesFor = (): SelectableNodeBox[] => {
      const hidden = api.current.hiddenIds;
      const boxes: SelectableNodeBox[] = [];
      for (const node of api.current.nodesRef.current) {
        if (hidden.has(node.id) || node.hidden) continue;
        const box = nodeSelectionBox(node);
        if (box.width > 0 && box.height > 0) {
          boxes.push(box);
          continue;
        }
        const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(node.id) : node.id;
        const el = root.querySelector(`.react-flow__node[data-id="${escaped}"]`);
        if (!el) {
          boxes.push(box);
          continue;
        }
        const rect = el.getBoundingClientRect();
        const topLeft = api.current.screenToFlowPosition({ x: rect.left, y: rect.top });
        const bottomRight = api.current.screenToFlowPosition({ x: rect.right, y: rect.bottom });
        boxes.push({
          ...box,
          x: topLeft.x,
          y: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
        });
      }
      return boxes;
    };

    const localBox = (startX: number, startY: number, x: number, y: number): ScreenBox => {
      const bounds = root.getBoundingClientRect();
      const rect = selectionRectFromPoints(
        { x: startX - bounds.left, y: startY - bounds.top },
        { x: x - bounds.left, y: y - bounds.top },
      );
      return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
    };

    const applySelection = (startX: number, startY: number, x: number, y: number) => {
      const flow = selectionRectFromPoints(
        api.current.screenToFlowPosition({ x: startX, y: startY }),
        api.current.screenToFlowPosition({ x, y }),
      );
      const ids = new Set(nodesInsideSelection(boxesFor(), flow));
      api.current.setNodes((prev) => withSelectedIds(prev, ids));
    };

    const onPointerDown = (event: Event) => {
      if (!isPointer(event) || event.pointerType === "touch" || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element) || !isCanvasPaneTarget(target)) return;
      const platform = selectionPlatformOf({
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      });
      const selecting = isModifierSelectionGesture({
        platform,
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
      });
      if (!selecting && !api.current.moveArmed) return;
      // pointerdown is followed by mousedown for the same click. Keep the first gesture.
      event.preventDefault();
      event.stopPropagation();
      if (drag) return;
      drag = { kind: selecting ? "select" : "move", x: event.clientX, y: event.clientY, active: false };
      if (!selecting) beginMove();
    };

    const onPointerMove = (event: Event) => {
      if (!drag || !isPointer(event)) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (drag.kind === "select") {
        setSelectionBox(localBox(drag.x, drag.y, event.clientX, event.clientY));
        if (!drag.active && !selectionPassedThreshold(dx, dy)) return;
        drag.active = true;
        applySelection(drag.x, drag.y, event.clientX, event.clientY);
        return;
      }
      if (!drag.active && !selectionPassedThreshold(dx, dy)) return;
      drag.active = true;
      updateMove(dx, dy);
    };

    const onPointerUp = () => {
      if (!drag) return;
      const finished = drag;
      drag = null;
      setSelectionBox(null);
      if (finished.kind === "select") {
        if (finished.active) swallowClick = true;
        return;
      }
      endMove(finished.active);
      if (finished.active) swallowClick = true;
    };

    const onClick = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    // Capture both: d3-zoom pans on mousedown, and the pane selects on pointerdown.
    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    root.addEventListener("click", onClick, true);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown, true);
      root.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      root.removeEventListener("click", onClick, true);
    };
  }, [beginMove, endMove, params.containerRef, updateMove]);

  return { selectionBox, moveArmed, toggleMove, beginMove, updateMove, endMove };
}

function isPointer(event: Event): event is PointerLike & Event {
  return "clientX" in event && "button" in event;
}
