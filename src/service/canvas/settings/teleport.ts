// Teleport settings: section, ratio, mood, and grade, merged into trim / render / grade at run time.

import { changedValueKeys } from "@/service/canvas/settings/values";
import { clampSectionLength, trimToolParams } from "@/service/canvas/settings/section";
import type { SettingsKindDef } from "@/service/canvas/settings/types";

const TARGET_MODELS = ["ffmpeg:trim-speed", "scro:teleport-render", "ffmpeg:color-grade"];

export const teleportSettingsKind: SettingsKindDef<"teleport"> = {
  kind: "teleport",
  label: { zh: "Teleport 設定", en: "Teleport Settings" },
  color: "#38bdf8",
  accepts: (target) => target.type === "model" && TARGET_MODELS.includes(target.data.modelId ?? ""),
  resolve: ({ values }, target, ctx) => {
    switch (target.data.modelId) {
      case "ffmpeg:trim-speed":
        return { presetId: "1.0x", toolParams: trimToolParams(values.sectionStart, values.sectionLength) };
      case "scro:teleport-render": {
        const mood = values.mood?.trim();
        return {
          aspectRatio: values.aspectRatio,
          presetId: values.aspectRatio,
          durationSeconds: clampSectionLength(values.sectionLength),
          // A wired Mood prompt node still wins over the settings mood.
          ...(mood && !ctx.hasPromptWire ? { prompt: mood } : {}),
        };
      }
      case "ffmpeg:color-grade":
        return { presetId: values.gradeLook, toolParams: { gradeLook: values.gradeLook } };
      default:
        return {};
    }
  },
  changed: (a, b) => changedValueKeys(a.values, b.values),
  defaults: () => ({
    kind: "teleport",
    values: { sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
  }),
};
