// Short name for one clip in the FFmpeg Concat order list.

import type { CanvasEdge, CanvasNode } from "@/model/canvas";

const DIRECTOR_PREFACE = /^(ON-CANVAS TEXT|SILENT ON-SCREEN)/;

function namedLine(node: CanvasNode | undefined): string | undefined {
  if (!node) return undefined;
  const named = node.data.fileName?.trim() || node.data.label?.trim();
  if (named) return named;
  const raw = node.data.prompt?.trim() || node.data.text?.trim();
  if (!raw) return undefined;
  const line = raw
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0 && !DIRECTOR_PREFACE.test(part));
  if (!line) return undefined;
  return line.length > 42 ? `${line.slice(0, 42)}…` : line;
}

// Prefers the wired node's own name, then a nearby spoken line, then the model name.
export function concatClipLabel(input: {
  sourceId: string;
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
  index: number;
  isZh: boolean;
  modelName?: (node: CanvasNode) => string | undefined;
}): string {
  const fallback = input.isZh ? `影片 ${input.index + 1}` : `Video ${input.index + 1}`;
  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const source = nodeById.get(input.sourceId);
  const own = namedLine(source);
  if (own) return own;

  const seen = new Set<string>([input.sourceId]);
  const queue: string[] = [];
  // Spoken audio is the clip the viewer recognizes, so follow that wire before the picture prompt.
  const enqueue = (targetId: string) => {
    const incoming = input.edges.filter((edge) => edge.target === targetId);
    const ordered = [
      ...incoming.filter((edge) => edge.targetHandle === "refAudio"),
      ...incoming.filter((edge) => edge.targetHandle !== "refAudio"),
    ];
    for (const edge of ordered) queue.push(edge.source);
  };
  enqueue(input.sourceId);
  while (queue.length > 0 && seen.size < 12) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const line = namedLine(nodeById.get(id));
    if (line) return line;
    enqueue(id);
  }

  if (source) {
    const model = input.modelName?.(source)?.trim();
    if (model) return model;
  }
  return fallback;
}
