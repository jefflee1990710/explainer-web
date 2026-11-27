// Fills `{{key}}` in a node's own text fields from a Setting's vars.

import type { CanvasNodeData } from "@/model/canvas";
import type { SettingsVars } from "@/model/canvas-settings";
import type { CanvasModelSpec } from "@/model/canvas-model";
import { findCanvasModel, STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { promptPlaceholder, renderPromptTemplate } from "@/service/canvas/core/settings/template";

// Free-text tool params that are not declared as kind "string" on the spec.
const EXTRA_TEXT_KEYS = ["sceneText", "objectTarget"] as const;

type TextNode = { type?: string | null; data: CanvasNodeData };

function stringKeys(modelId: string | undefined, catalog: readonly CanvasModelSpec[]): string[] {
  const spec = modelId ? findCanvasModel(modelId, catalog) : undefined;
  const declared = (spec?.toolParams ?? []).filter((field) => field.kind === "string").map((field) => field.key);
  return [...declared, ...EXTRA_TEXT_KEYS];
}

function sequenceLayerTexts(toolParams: Record<string, unknown> | undefined): string[] {
  const sequence = toolParams?.sequence;
  if (!sequence || typeof sequence !== "object") return [];
  const overlay = (sequence as { tracks?: { overlay?: { text?: unknown }[] } }).tracks?.overlay;
  if (!Array.isArray(overlay)) return [];
  return overlay.flatMap((layer) => (typeof layer?.text === "string" ? [layer.text] : []));
}

// Every user-typed string on this node that a wired Setting can fill.
export function settingsTexts(node: TextNode, catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS): string[] {
  const texts: string[] = [];
  if (node.type === "prompt") {
    texts.push(node.data.text ?? "");
    return texts;
  }
  if (typeof node.data.prompt === "string") texts.push(node.data.prompt);
  if (typeof node.data.negativePrompt === "string") texts.push(node.data.negativePrompt);
  if (node.data.modelId === "scro:auto-captions" && typeof node.data.text === "string") texts.push(node.data.text);
  const params = node.data.toolParams ?? {};
  for (const key of stringKeys(node.data.modelId, catalog)) {
    const value = params[key];
    if (typeof value === "string") texts.push(value);
  }
  texts.push(...sequenceLayerTexts(params));
  return texts;
}

export function missingPlaceholderLabels(texts: readonly string[], vars: SettingsVars): string[] {
  const missing: string[] = [];
  for (const text of texts) {
    for (const key of renderPromptTemplate(text, vars).missing) {
      const label = promptPlaceholder(key);
      if (!missing.includes(label)) missing.push(label);
    }
  }
  return missing;
}

function fillString(value: string, vars: SettingsVars): string {
  return value.includes("{{") ? renderPromptTemplate(value, vars).text : value;
}

function fillSequence(sequence: unknown, vars: SettingsVars): unknown {
  if (!sequence || typeof sequence !== "object") return sequence;
  const seq = sequence as { tracks?: { overlay?: Array<Record<string, unknown>> } };
  const overlay = seq.tracks?.overlay;
  if (!Array.isArray(overlay)) return sequence;
  let changed = false;
  const nextOverlay = overlay.map((layer) => {
    if (typeof layer.text !== "string") return layer;
    const text = fillString(layer.text, vars);
    if (text === layer.text) return layer;
    changed = true;
    return { ...layer, text };
  });
  if (!changed) return sequence;
  return { ...seq, tracks: { ...seq.tracks, overlay: nextOverlay } };
}

// Copy of toolParams with string fields filled. Same reference when nothing changes.
export function fillToolParams(
  modelId: string | undefined,
  toolParams: Record<string, unknown> | undefined,
  vars: SettingsVars,
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): Record<string, unknown> | undefined {
  if (!toolParams) return toolParams;
  const next: Record<string, unknown> = { ...toolParams };
  let changed = false;
  for (const key of stringKeys(modelId, catalog)) {
    const value = next[key];
    if (typeof value !== "string") continue;
    const filled = fillString(value, vars);
    if (filled === value) continue;
    next[key] = filled;
    changed = true;
  }
  const sequence = fillSequence(next.sequence, vars);
  if (sequence !== next.sequence) {
    next.sequence = sequence;
    changed = true;
  }
  return changed ? next : toolParams;
}

// Node copy whose typed text has Setting values substituted.
export function fillNodeTextData<T extends TextNode>(
  node: T,
  vars: SettingsVars,
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): T {
  const toolParams = fillToolParams(node.data.modelId, node.data.toolParams, vars, catalog);
  const prompt = typeof node.data.prompt === "string" ? fillString(node.data.prompt, vars) : undefined;
  const negativePrompt = typeof node.data.negativePrompt === "string" ? fillString(node.data.negativePrompt, vars) : undefined;
  const text =
    node.data.modelId === "scro:auto-captions" && typeof node.data.text === "string"
      ? fillString(node.data.text, vars)
      : node.type === "prompt" && typeof node.data.text === "string"
        ? fillString(node.data.text, vars)
        : undefined;
  return {
    ...node,
    data: {
      ...node.data,
      ...(prompt !== undefined ? { prompt } : {}),
      ...(negativePrompt !== undefined ? { negativePrompt } : {}),
      ...(text !== undefined ? { text } : {}),
      ...(toolParams ? { toolParams } : {}),
    },
  };
}
