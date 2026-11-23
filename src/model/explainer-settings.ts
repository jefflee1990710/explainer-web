import { z } from "zod";
import type { SceneTextChoice } from "@/model/project";
import { SUBTITLE_LOOK_IDS, type SubtitleLook } from "@/model/subtitle-look-id";

// Diagram explainer directors a canvas Explainer can be planned with.
export const EXPLAINER_SKILL_SLUGS = [
  "cartoon-explainer-video-director",
  "paper-cutout-explainer-video-director",
  "papercraft-diorama-director",
] as const;
export type ExplainerSkillSlug = (typeof EXPLAINER_SKILL_SLUGS)[number];

export const EXPLAINER_PRESENTER_POSITIONS = ["auto", "lower-left", "lower-right"] as const;
export type ExplainerPresenterPosition = (typeof EXPLAINER_PRESENTER_POSITIONS)[number];

export const EXPLAINER_SCENE_TEXT_CHOICES = ["zh-Hant", "zh-Hans", "en", "ja", "ko", "none"] as const;

// Look settings of one canvas Explainer group, each mapped onto a backing-video field.
export type ExplainerSettings = {
  skillSlug: ExplainerSkillSlug;
  // A preset id of skillSlug's director; missing when the director has no presets.
  backgroundId?: string;
  textStyleId: SubtitleLook;
  sceneTextLanguage: SceneTextChoice;
  presenterPosition: ExplainerPresenterPosition;
};

// Stored on the Explainer Settings node (`type: "settings"`).
export type ExplainerSettingsNodeData = {
  // The canvasPlanOnly backing video the group was expanded from.
  plannerVideoId: string;
  // Plan topic without the appended presenter / narration blocks.
  topic: string;
  applied: ExplainerSettings;
  // Written by the assistant; the client applies it after replaying the turn.
  pending?: ExplainerSettings;
};

export const explainerSettingsSchema: z.ZodType<ExplainerSettings> = z.object({
  skillSlug: z.enum(EXPLAINER_SKILL_SLUGS),
  backgroundId: z.string().optional(),
  textStyleId: z.enum(SUBTITLE_LOOK_IDS),
  sceneTextLanguage: z.enum(EXPLAINER_SCENE_TEXT_CHOICES),
  presenterPosition: z.enum(EXPLAINER_PRESENTER_POSITIONS),
});

export const explainerSettingsNodeDataSchema: z.ZodType<ExplainerSettingsNodeData> = z.object({
  plannerVideoId: z.string().min(1),
  topic: z.string(),
  applied: explainerSettingsSchema,
  pending: explainerSettingsSchema.optional(),
});
