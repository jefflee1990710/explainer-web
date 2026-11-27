// Assistant prompt lines for the $0 FFmpeg edit nodes, built from the catalog
// so every key the prompt names is one the allowlist accepts.

import type { CanvasModelSpec, CanvasToolParamSpec } from "@/model/canvas-model";

export function describeToolParam(param: CanvasToolParamSpec): string {
  const note = param.hint ? `; ${param.hint}` : "";
  if (param.kind === "enum") return `${param.key} (${(param.values ?? []).map((v) => `"${v}"`).join("|")}${note})`;
  if (param.kind === "number") {
    const range = param.min !== undefined && param.max !== undefined ? ` ${param.min}..${param.max}` : "";
    return `${param.key} (number${range}${note})`;
  }
  return `${param.key} (${param.kind}${note})`;
}

// One line per available FFmpeg node: what it does, then every toolParams key it reads.
export function canvasAgentEditNodeLines(catalog: readonly CanvasModelSpec[]): string[] {
  return catalog
    .filter((spec) => spec.provider === "ffmpeg" && spec.available !== false && !spec.hiddenInSidebar)
    .map((spec) => {
      const params = spec.toolParams ?? [];
      const keys = params.length > 0 ? ` toolParams: ${params.map(describeToolParam).join(", ")}.` : "";
      return `  - "${spec.id}": ${spec.agentHint ?? spec.name}${keys}`;
    });
}
