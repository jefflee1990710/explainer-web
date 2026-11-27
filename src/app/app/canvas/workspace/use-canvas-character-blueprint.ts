"use client";

// Saves the blueprint on an empty character node into the character library.

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Edge } from "@xyflow/react";
import { toast } from "sonner";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { resolveNodeInputs } from "@/service/canvas/core/graph";
import { saveCanvasCharacterBlueprintAction } from "@/presentation/actions/canvas";
import type { PublicCharacter } from "@/presentation/serialize";
import { toDomainEdges, toDomainNodes, type FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";

export type CanvasCharacterBlueprintHookDeps = {
  isZh: boolean;
  models: readonly CanvasModelSpec[];
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  scheduleAutosave: () => void;
  nodesRef: MutableRefObject<FlowNode[]>;
  edgesRef: MutableRefObject<Edge[]>;
  onSaved: (character: PublicCharacter) => void;
};

export function useCanvasCharacterBlueprint({
  isZh,
  models,
  setNodes,
  scheduleAutosave,
  nodesRef,
  edgesRef,
  onSaved,
}: CanvasCharacterBlueprintHookDeps) {
  const onSaveCharacterBlueprint = useCallback(
    async (nodeId: string) => {
      const node = nodesRef.current.find((item) => item.id === nodeId);
      const blueprintUrl = node?.data.outputUrl?.trim();
      const name = node?.data.label?.trim() ?? "";
      if (!node || !blueprintUrl) {
        toast.error(isZh ? "請先生成角色藍圖" : "Generate a blueprint first");
        return;
      }
      if (!name) {
        toast.error(isZh ? "請先輸入角色名稱" : "Enter a character name first");
        return;
      }
      const resolved = resolveNodeInputs(
        nodeId,
        toDomainNodes(nodesRef.current),
        toDomainEdges(edgesRef.current),
        models,
      );
      const referenceImageUrls = [
        ...resolved.inputs.refImages,
        ...(resolved.inputs.outfitRefs ?? []).map((wire) => wire.url),
      ];
      const result = await saveCanvasCharacterBlueprintAction({
        name,
        blueprintUrl,
        prompt: node.data.prompt,
        referenceImageUrls,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNodes((prev) =>
        prev.map((item) =>
          item.id === nodeId
            ? {
                ...item,
                data: {
                  ...item.data,
                  label: result.character.name,
                  characterId: result.character.id,
                  toolParams: {
                    ...(item.data.toolParams ?? {}),
                    savedCharacterId: result.character.id,
                    savedBlueprintUrl: blueprintUrl,
                  },
                },
              }
            : item,
        ),
      );
      onSaved(result.character);
      scheduleAutosave();
      toast.success(isZh ? "已儲存為角色" : "Saved as a character");
    },
    [edgesRef, isZh, models, nodesRef, onSaved, scheduleAutosave, setNodes],
  );

  return { onSaveCharacterBlueprint };
}
