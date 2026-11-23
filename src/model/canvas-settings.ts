import { z } from "zod";
import type { CanvasAspectRatio } from "@/model/canvas";
import {
  explainerSettingsSchema,
  type ExplainerSettingsNodeData,
} from "@/model/explainer-settings";

export const SWAP_SETTINGS_MODES = ["character", "object", "relight", "colorfix"] as const;
export const SWAP_OBJECT_EDIT_MODES = ["change", "add", "remove"] as const;
export const CANVAS_GRADE_LOOKS = ["jutsu", "talking-head", "talking-head-selfie"] as const;
export type CanvasGradeLook = (typeof CANVAS_GRADE_LOOKS)[number];

export type SwapSettings = {
  swapMode: (typeof SWAP_SETTINGS_MODES)[number];
  objectTarget?: string;
  objectEditMode?: (typeof SWAP_OBJECT_EDIT_MODES)[number];
  lightLookId?: string;
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
  gradeLook: CanvasGradeLook;
};

export type TeleportSettings = {
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
  mood?: string;
  gradeLook: CanvasGradeLook;
};

// One settings node; `kind` picks the card, the targets it accepts, and how it applies.
export type CanvasSettingsData =
  | ({ kind: "explainer" } & ExplainerSettingsNodeData)
  | { kind: "swap"; values: SwapSettings }
  | { kind: "teleport"; values: TeleportSettings };
export type CanvasSettingsKind = CanvasSettingsData["kind"];

// Kept local: importing the canvas.ts schema here would make a runtime import cycle.
const aspectRatioSchema = z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]);
const sectionStart = z.number().finite().min(0);
const sectionLength = z.number().finite().min(2).max(15);

export const swapSettingsSchema = z.object({
  swapMode: z.enum(SWAP_SETTINGS_MODES),
  objectTarget: z.string().max(200).optional(),
  objectEditMode: z.enum(SWAP_OBJECT_EDIT_MODES).optional(),
  lightLookId: z.string().max(80).optional(),
  sectionStart,
  sectionLength,
  aspectRatio: aspectRatioSchema,
  gradeLook: z.enum(CANVAS_GRADE_LOOKS),
});

export const teleportSettingsSchema = z.object({
  sectionStart,
  sectionLength,
  aspectRatio: aspectRatioSchema,
  mood: z.string().max(400).optional(),
  gradeLook: z.enum(CANVAS_GRADE_LOOKS),
});

export const canvasSettingsDataSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("explainer"),
    plannerVideoId: z.string().min(1),
    topic: z.string(),
    applied: explainerSettingsSchema,
    pending: explainerSettingsSchema.optional(),
    draft: explainerSettingsSchema.optional(),
  }),
  z.object({ kind: z.literal("swap"), values: swapSettingsSchema }),
  z.object({ kind: z.literal("teleport"), values: teleportSettingsSchema }),
]) as unknown as z.ZodType<CanvasSettingsData>;
