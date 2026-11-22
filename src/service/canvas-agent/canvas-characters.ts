// Finds which saved characters already appear on the canvas, so new director cards reuse them.

import type { CanvasNode } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";

const CHARACTER_URL = /\/characters\/([a-f0-9]{24})\//i;

type WithCharacters = { characters: readonly CanvasLibraryCharacterOption[] };

// Character ids shown on the canvas: a cast character's photo or a lock image under /characters/<id>/.
export function canvasCharacterIds(g: WithCharacters, nodes: readonly CanvasNode[]): string[] {
  const known = new Set(g.characters.map((c) => c.id));
  const found = new Set<string>();
  for (const node of nodes) {
    const fromParams = node.data.toolParams?.characterId;
    if (typeof fromParams === "string" && known.has(fromParams)) found.add(fromParams);
    const url = node.data.mediaUrl;
    if (!url) continue;
    const byPreview = g.characters.find((c) => c.previewUrl && c.previewUrl === url)?.id;
    if (byPreview) found.add(byPreview);
    const byPath = CHARACTER_URL.exec(url)?.[1];
    if (byPath && known.has(byPath)) found.add(byPath);
  }
  return [...found];
}

// The one character on the canvas, or undefined when there are none or several.
export function soleCanvasCharacterId(
  g: WithCharacters,
  nodes: readonly CanvasNode[],
): string | undefined {
  const ids = canvasCharacterIds(g, nodes);
  return ids.length === 1 ? ids[0] : undefined;
}
