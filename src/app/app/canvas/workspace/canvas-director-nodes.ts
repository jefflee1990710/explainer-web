// Director cards placed by a drop or a template. Plan and Build stay on the card.

import type { FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";
import { EXPLAINER_CARD_LENGTH_DEFAULT } from "@/service/canvas/directors/explainer-length";

// A dropped Talking Head is the planning card itself. Script and framing stay on the node.
export function talkingHeadDirectorNode(position: { x: number; y: number }, prompt = ""): FlowNode {
  return {
    id: `model-${crypto.randomUUID().slice(0, 8)}`,
    type: "model",
    position,
    data: {
      modelId: "scro:talking-head",
      aspectRatio: "9:16",
      prompt,
      status: "idle",
      toolParams: {
        plannerMode: true,
        language: "yue",
        framing: "collarbone-close",
      },
    },
  };
}

// A dropped Swap or Teleport is the director card. Build expands the rows; the card stays.
export function swapDirectorNode(position: { x: number; y: number }, prompt = ""): FlowNode {
  return {
    id: `model-${crypto.randomUUID().slice(0, 8)}`,
    type: "model",
    position,
    data: {
      modelId: "scro:swap",
      aspectRatio: "9:16",
      prompt,
      status: "idle",
      toolParams: { directorMode: true, swapMode: "character", sectionStart: 0, sectionLength: 6 },
    },
  };
}

export function teleportDirectorNode(position: { x: number; y: number }, prompt = "", sceneText = ""): FlowNode {
  return {
    id: `model-${crypto.randomUUID().slice(0, 8)}`,
    type: "model",
    position,
    data: {
      modelId: "scro:teleport",
      aspectRatio: "9:16",
      prompt,
      status: "idle",
      toolParams: { directorMode: true, sectionStart: 0, sectionLength: 6, sceneText },
    },
  };
}

// A dropped Explainer is the Director card itself. Settings stay on the node; Plan is pressed there.
export function explainerDirectorNode(position: { x: number; y: number }, prompt = ""): FlowNode {
  return {
    id: `model-${crypto.randomUUID().slice(0, 8)}`,
    type: "model",
    position,
    data: {
      modelId: "scro:explainer",
      aspectRatio: "9:16",
      prompt,
      status: "idle",
      toolParams: {
        plannerMode: true,
        skillSlug: "cartoon-explainer-video-director",
        language: "yue",
        durationPreset: EXPLAINER_CARD_LENGTH_DEFAULT,
        textStyleId: "handwritten",
        presenterPosition: "auto",
      },
    },
  };
}
