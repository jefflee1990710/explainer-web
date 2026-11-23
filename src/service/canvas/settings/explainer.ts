// Explainer settings: applied by Apply / Replan into the frame prompts, so nothing merges at run time.

import { explainerSettingsChanges } from "@/service/canvas/explainer-settings";
import type { SettingsKindDef } from "@/service/canvas/settings/types";

const FRAME_ID = /-frame-\d+$/;

export const explainerSettingsKind: SettingsKindDef<"explainer"> = {
  kind: "explainer",
  label: { zh: "解說設定", en: "Explainer Settings" },
  color: "#f472b6",
  accepts: (target) => target.type === "model" && FRAME_ID.test(target.id),
  resolve: () => ({}),
  changed: (a, b) => explainerSettingsChanges(a.applied, b.applied).changed,
};
