import type { StyleId } from "@/model/style-id";
import { defaultStyleBehavior, type IStyle, type IStyleBehavior } from "@/model/style";

export { defaultStyleBehavior, type IStyle, type IStyleBehavior, type StyleId };

// Prompt-driving visual style. Colour words only in prompt fields;
// `canvasColor` is for UI cards and alpha-flattening and never reaches a prompt.
export type Style = Omit<IStyle, "behavior"> & {
  behavior?: IStyleBehavior;
};
