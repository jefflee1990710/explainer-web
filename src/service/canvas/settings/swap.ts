// Swap settings: section, mode, light, ratio, and grade, merged into trim / render / grade at run time.

import { changedValueKeys } from "@/service/canvas/settings/values";
import { clampSectionLength, trimToolParams } from "@/service/canvas/settings/section";
import type { SettingsKindDef } from "@/service/canvas/settings/types";

const TARGET_MODELS = ["ffmpeg:trim-speed", "scro:swap-render", "ffmpeg:color-grade"];

export const swapSettingsKind: SettingsKindDef<"swap"> = {
  kind: "swap",
  label: { zh: "Swap 設定", en: "Swap Settings" },
  color: "#a78bfa",
  accepts: (target) => target.type === "model" && TARGET_MODELS.includes(target.data.modelId ?? ""),
  resolve: ({ values }, target) => {
    switch (target.data.modelId) {
      case "ffmpeg:trim-speed":
        return { presetId: "1.0x", toolParams: trimToolParams(values.sectionStart, values.sectionLength) };
      case "scro:swap-render":
        return {
          aspectRatio: values.aspectRatio,
          presetId: values.aspectRatio,
          durationSeconds: clampSectionLength(values.sectionLength),
          toolParams: {
            swapMode: values.swapMode,
            ...(values.objectTarget ? { objectTarget: values.objectTarget } : {}),
            ...(values.objectEditMode ? { objectEditMode: values.objectEditMode } : {}),
            ...(values.lightLookId ? { lightLookId: values.lightLookId } : {}),
          },
        };
      case "ffmpeg:color-grade":
        return { presetId: values.gradeLook, toolParams: { gradeLook: values.gradeLook } };
      default:
        return {};
    }
  },
  changed: (a, b) => changedValueKeys(a.values, b.values),
  defaults: () => ({
    kind: "swap",
    values: { swapMode: "character", sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
  }),
};
