import type { SceneTextChoice } from "@/model/project";
import type { SubtitleLook } from "@/model/subtitle-look-id";

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

// Look settings of one canvas Explainer Director, each mapped onto a backing-video field.
export type ExplainerSettings = {
  skillSlug: ExplainerSkillSlug;
  // A preset id of skillSlug's director; missing when the director has no presets.
  backgroundId?: string;
  textStyleId: SubtitleLook;
  sceneTextLanguage: SceneTextChoice;
  presenterPosition: ExplainerPresenterPosition;
};
