// Last 製作 (1) or 影片 (2) tab for one video, kept in this browser only.

export function editorTabStorageKey(videoId: string) {
  return `explainer.editorTab:${videoId}`;
}

export function parseEditorTab(raw: string | null): 1 | 2 | null {
  if (raw === "1") return 1;
  if (raw === "2") return 2;
  return null;
}

// Drop 影片 when that step is still locked. No saved click keeps the usual default.
export function rememberedEditorStep(raw: string | null, clipsReady: boolean): 1 | 2 | null {
  const saved = parseEditorTab(raw);
  if (saved === 2 && !clipsReady) return null;
  return saved;
}
