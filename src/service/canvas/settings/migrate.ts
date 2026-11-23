// Brings canvases saved before settings kinds up to date when they load.

import type { CanvasNode } from "@/model/canvas";
import type { ExplainerSettingsNodeData } from "@/model/explainer-settings";

type LegacyData = CanvasNode["data"] & { explainerSettings?: ExplainerSettingsNodeData };

// Older Explainer Settings nodes stored their data under `explainerSettings`.
export function upgradeLegacySettingsNodes(nodes: readonly CanvasNode[]): { nodes: CanvasNode[]; changed: boolean } {
  let changed = false;
  const next = nodes.map((node) => {
    const data = node.data as LegacyData;
    if (!data.explainerSettings) return node;
    changed = true;
    const { explainerSettings, ...rest } = data;
    return { ...node, data: { ...rest, settings: { kind: "explainer" as const, ...explainerSettings } } };
  });
  return { nodes: next, changed };
}
