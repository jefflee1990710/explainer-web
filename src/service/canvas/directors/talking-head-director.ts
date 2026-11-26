// Pure helpers for the persistent Talking Head Director node (scro:talking-head in planner mode).

import type { CanvasAspectRatio, CanvasNode } from "@/model/canvas";
import { TALKING_HEAD_PLANNER_MODEL_ID } from "@/service/canvas/directors/explainer-planner";

// Talking Head Director: every card field that changes the plan.
export type TalkingHeadDirectorParams = {
  script: string;
  characterId?: string;
  language: string;
  framing: string;
  aspectRatio: CanvasAspectRatio;
};

type NodeLike = Pick<CanvasNode, "type" | "data">;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function isTalkingHeadDirectorNode(node: NodeLike): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID &&
    node.data.toolParams?.plannerMode === true
  );
}

export function talkingHeadDirectorParams(node: NodeLike): TalkingHeadDirectorParams {
  const tp = node.data.toolParams ?? {};
  const characterId = str(tp.characterId);
  return {
    script: (node.data.prompt ?? "").trim(),
    ...(characterId ? { characterId } : {}),
    language: str(tp.language) ?? "yue",
    framing: str(tp.framing) ?? "collarbone-close",
    aspectRatio: node.data.aspectRatio ?? "9:16",
  };
}
