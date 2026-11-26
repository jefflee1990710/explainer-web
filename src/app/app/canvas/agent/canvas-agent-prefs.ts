// Browser preferences for the canvas assistant dock. The chat language lives in
// localStorage so a reload or a switch to another canvas keeps the user's choice.

import { isCanvasAgentLanguage, type CanvasAgentLanguage } from "@/service/canvas-agent/types";

export const CANVAS_AGENT_LANGUAGE_KEY = "scro.canvasAgent.language";

const LANGUAGE_EVENT = "scro-canvas-agent-language";

export function languageFromStorage(raw: string | null, fallback: CanvasAgentLanguage): CanvasAgentLanguage {
  return isCanvasAgentLanguage(raw) ? raw : fallback;
}

function browserLocalStorage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

export function readCanvasAgentLanguage(fallback: CanvasAgentLanguage): CanvasAgentLanguage {
  const storage = browserLocalStorage();
  if (!storage) return fallback;
  try {
    return languageFromStorage(storage.getItem(CANVAS_AGENT_LANGUAGE_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function writeCanvasAgentLanguage(next: CanvasAgentLanguage): void {
  const storage = browserLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(CANVAS_AGENT_LANGUAGE_KEY, next);
  } catch {
    return;
  }
  globalThis.dispatchEvent?.(new Event(LANGUAGE_EVENT));
}

export function subscribeCanvasAgentLanguage(onStoreChange: () => void): () => void {
  if (typeof globalThis.addEventListener !== "function") return () => {};
  const onStorage = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== CANVAS_AGENT_LANGUAGE_KEY) return;
    onStoreChange();
  };
  globalThis.addEventListener("storage", onStorage);
  globalThis.addEventListener(LANGUAGE_EVENT, onStoreChange);
  return () => {
    globalThis.removeEventListener("storage", onStorage);
    globalThis.removeEventListener(LANGUAGE_EVENT, onStoreChange);
  };
}
