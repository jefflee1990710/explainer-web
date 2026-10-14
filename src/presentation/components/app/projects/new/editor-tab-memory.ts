// Last Video tab (1) for one video, kept in this browser only.
// Legacy saves used 2 for the old Export/Video step — treat as Video.

export function editorTabStorageKey(videoId: string) {
  return `explainer.editorTab:${videoId}`;
}

export function parseEditorTab(raw: string | null): 1 | null {
  if (raw === "1" || raw === "2") return 1;
  return null;
}

/** Remembered editor step. Video unlocks once Phase A has clips. */
export function rememberedEditorStep(raw: string | null, phaseAReady: boolean): 1 | null {
  const saved = parseEditorTab(raw);
  if (saved == null) return null;
  if (!phaseAReady) return null;
  return saved;
}
