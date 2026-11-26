"use client";

// Drag & drop onto the canvas pane: sidebar models, Prompt / Setting tiles, library assets, and local files.

import { useCallback, useState } from "react";
import type { Edge, ReactFlowInstance, XYPosition } from "@xyflow/react";
import type { CanvasLibraryAsset } from "@/model/canvas-dto";
import { CANVAS_DRAG_ASSET_MIME, CANVAS_DRAG_MODEL_MIME } from "@/app/app/canvas/canvas-sidebar";
import { CANVAS_DRAG_PROMPT_MIME } from "@/app/app/canvas/canvas-prompt-tool";
import { CANVAS_DRAG_SETTINGS_MIME } from "@/app/app/canvas/canvas-settings-tool";
import type { DisplayNode } from "@/app/app/canvas/groups/group-frames";

export type CanvasPaneDropHookDeps = {
  reactFlow: Pick<ReactFlowInstance<DisplayNode, Edge>, "screenToFlowPosition">;
  addModelNodeAt: (modelId: string, position: XYPosition) => void;
  addPromptNode: (position: XYPosition) => void;
  addSettingsNode: (position: XYPosition) => void;
  addAssetNodeAt: (asset: CanvasLibraryAsset, position: XYPosition) => void;
  uploadAndPlaceFiles: (files: FileList, position: XYPosition) => Promise<void>;
};

export function useCanvasPaneDrop({
  reactFlow,
  addModelNodeAt,
  addPromptNode,
  addSettingsNode,
  addAssetNodeAt,
  uploadAndPlaceFiles,
}: CanvasPaneDropHookDeps) {
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Drag & drop onto canvas pane (supports local files, sidebar models, sidebar Scro assets).
  const handlePaneDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (event.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true);
    }
  }, []);

  const handlePaneDragLeave = useCallback((event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) return;
    setIsDraggingFile(false);
  }, []);

  const handlePaneDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDraggingFile(false);
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const modelId = event.dataTransfer.getData(CANVAS_DRAG_MODEL_MIME);
      if (modelId) {
        addModelNodeAt(modelId, position);
        return;
      }

      if (event.dataTransfer.getData(CANVAS_DRAG_PROMPT_MIME) === "prompt") {
        addPromptNode(position);
        return;
      }

      if (event.dataTransfer.getData(CANVAS_DRAG_SETTINGS_MIME)) {
        addSettingsNode(position);
        return;
      }

      const rawAsset = event.dataTransfer.getData(CANVAS_DRAG_ASSET_MIME);
      if (rawAsset) {
        try {
          const parsed = JSON.parse(rawAsset) as CanvasLibraryAsset;
          addAssetNodeAt(parsed, position);
        } catch {
          // ignore malformed drag payload
        }
        return;
      }

      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        void uploadAndPlaceFiles(event.dataTransfer.files, position);
      }
    },
    [reactFlow, addModelNodeAt, addPromptNode, addSettingsNode, addAssetNodeAt, uploadAndPlaceFiles],
  );

  return { isDraggingFile, handlePaneDragOver, handlePaneDragLeave, handlePaneDrop };
}
