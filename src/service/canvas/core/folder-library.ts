// Pure canvas-library helpers. Safe to import from client components; no database or Node APIs.

import type { CanvasLibrarySelection } from "@/model/canvas-dto";

export const CANVAS_FOLDER_NAME_MAX = 80;

export function normalizeCanvasFolderName(raw: string): string {
  return raw.trim().slice(0, CANVAS_FOLDER_NAME_MAX);
}

// "all" keeps every canvas; "unfiled" keeps canvases with no folder; a folder id keeps that folder.
export function canvasesInFolder<T extends { folderId?: string }>(
  projects: readonly T[],
  selection: CanvasLibrarySelection,
): T[] {
  if (selection === "all") return [...projects];
  if (selection === "unfiled") return projects.filter((project) => !project.folderId);
  return projects.filter((project) => project.folderId === selection);
}
