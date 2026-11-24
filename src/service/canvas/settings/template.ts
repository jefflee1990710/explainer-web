// Pure `{{key}}` prompt templates filled from wired Setting nodes.

import type { SettingsVars } from "@/model/canvas-settings";

const PLACEHOLDER = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export function promptPlaceholder(key: string): string {
  return `{{${key}}}`;
}

// Keys used in the text, in first-seen order.
export function promptPlaceholders(text: string): string[] {
  const keys: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (!keys.includes(match[1])) keys.push(match[1]);
  }
  return keys;
}

// Fills every known key; unknown keys stay as `{{key}}` and are listed in `missing`.
export function renderPromptTemplate(text: string, vars: SettingsVars): { text: string; missing: string[] } {
  const missing: string[] = [];
  const out = text.replace(PLACEHOLDER, (whole, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key];
    if (!missing.includes(key)) missing.push(key);
    return whole;
  });
  return { text: out, missing };
}
