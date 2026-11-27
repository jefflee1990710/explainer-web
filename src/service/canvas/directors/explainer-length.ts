// Length on the Explainer Director card. Auto lets Phase A choose the clip count.

import type { DurationPreset } from "@/model/project";

export const EXPLAINER_CARD_LENGTHS = ["auto", "15s", "30s", "45s", "60s"] as const;
export type ExplainerCardLength = (typeof EXPLAINER_CARD_LENGTHS)[number];

// A new card, and a card with no saved length, starts here.
export const EXPLAINER_CARD_LENGTH_DEFAULT: ExplainerCardLength = "auto";

const LENGTHS: readonly string[] = EXPLAINER_CARD_LENGTHS;

// Blank or unknown becomes Auto. A saved 15s / 30s / 45s / 60s stays as written.
export function explainerCardLength(raw: unknown): ExplainerCardLength {
  return typeof raw === "string" && LENGTHS.includes(raw) ? (raw as ExplainerCardLength) : EXPLAINER_CARD_LENGTH_DEFAULT;
}

// Phase A preset for a planner card. Fixed labels keep their existing budgets.
export function explainerCardDurationPreset(raw: unknown): DurationPreset {
  if (raw === "15s" || raw === "micro") return "micro";
  if (raw === "30s" || raw === "short") return "short";
  if (raw === "45s" || raw === "punchy") return "punchy";
  if (raw === "60s" || raw === "full") return "full";
  return "auto";
}
