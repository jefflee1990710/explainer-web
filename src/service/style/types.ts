import type { StyleId } from "@/model/style-id";

export type { StyleId };

// Prompt-driving visual style. Colour words only in prompt fields;
// `canvasColor` is for UI cards and alpha-flattening and never reaches a prompt.
export type Style = {
  id: StyleId;
  name: string;
  nameZh: string;
  description: string;
  canvas: string;
  canvasColor: string;
  look: string;
  palette: string;
  typography: string;
  motion: string;
  negatives: string;
};
