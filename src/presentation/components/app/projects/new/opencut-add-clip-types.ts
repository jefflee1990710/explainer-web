export type OpenCutAddClipMode = "simple" | "explainer" | "swap" | "teleport";

export type OpenCutAddClipCard = {
  mode: OpenCutAddClipMode;
  title: string;
  badge: string;
  description: string;
  costLabel: string;
};
