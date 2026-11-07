import type { DirectorSlug } from "@/model/director";
import { isDirectorSlug } from "@/model/director";
import type { DirectorRuleModule } from "@/service/director/rules/types";
import { cartoonExplainerVideoDirectorRules } from "@/service/director/rules/cartoon-explainer-video-director";
import { paperCutoutExplainerVideoDirectorRules } from "@/service/director/rules/paper-cutout-explainer-video-director";
import { papercraftDioramaDirectorRules } from "@/service/director/rules/papercraft-diorama-director";
import { storyShortDirectorRules } from "@/service/director/rules/story-short-director";
import { productDemoDirectorRules } from "@/service/director/rules/product-demo-director";
import { dialogueQaDirectorRules } from "@/service/director/rules/dialogue-qa-director";
import { listicleDirectorRules } from "@/service/director/rules/listicle-director";
import { tutorialDirectorRules } from "@/service/director/rules/tutorial-director";
import { openingDirectorRules } from "@/service/director/rules/opening-director";
import { endingDirectorRules } from "@/service/director/rules/ending-director";
import { talkingHeadDirectorRules } from "@/service/director/rules/talking-head-director";
import { fullBodyTalkingHeadDirectorRules } from "@/service/director/rules/full-body-talking-head-director";
import { comparisonCardDirectorRules } from "@/service/director/rules/comparison-card-director";
import { talkingBrollDirectorRules } from "@/service/director/rules/talking-broll-director";
import { surpriseInterviewDirectorRules } from "@/service/director/rules/surprise-interview-director";
import { outfitReelDirectorRules } from "@/service/director/rules/outfit-reel-director";
import { followShotDirectorRules } from "@/service/director/rules/follow-shot-director";
import { outfitChangeDirectorRules } from "@/service/director/rules/outfit-change-director";
import { workflowPromoDirectorRules } from "@/service/director/rules/workflow-promo-director";
import { styleSwitchDirectorRules } from "@/service/director/rules/style-switch-director";
import { editorialInterviewDirectorRules } from "@/service/director/rules/editorial-interview-director";
import { streetLookbookDirectorRules } from "@/service/director/rules/street-lookbook-director";

export type {
  DirectorPhaseABlockInput,
  DirectorPhaseBMotionInput,
  DirectorRuleModule,
} from "@/service/director/rules/types";

export const DIRECTOR_RULE_MODULES: Record<DirectorSlug, DirectorRuleModule> = {
  "cartoon-explainer-video-director": cartoonExplainerVideoDirectorRules,
  "paper-cutout-explainer-video-director": paperCutoutExplainerVideoDirectorRules,
  "papercraft-diorama-director": papercraftDioramaDirectorRules,
  "story-short-director": storyShortDirectorRules,
  "product-demo-director": productDemoDirectorRules,
  "dialogue-qa-director": dialogueQaDirectorRules,
  "listicle-director": listicleDirectorRules,
  "tutorial-director": tutorialDirectorRules,
  "opening-director": openingDirectorRules,
  "ending-director": endingDirectorRules,
  "talking-head-director": talkingHeadDirectorRules,
  "full-body-talking-head-director": fullBodyTalkingHeadDirectorRules,
  "comparison-card-director": comparisonCardDirectorRules,
  "talking-broll-director": talkingBrollDirectorRules,
  "surprise-interview-director": surpriseInterviewDirectorRules,
  "outfit-reel-director": outfitReelDirectorRules,
  "follow-shot-director": followShotDirectorRules,
  "outfit-change-director": outfitChangeDirectorRules,
  "workflow-promo-director": workflowPromoDirectorRules,
  "style-switch-director": styleSwitchDirectorRules,
  "editorial-interview-director": editorialInterviewDirectorRules,
  "street-lookbook-director": streetLookbookDirectorRules,
};

export function getDirectorRuleModule(skillSlug?: string): DirectorRuleModule {
  if (skillSlug && isDirectorSlug(skillSlug)) {
    return DIRECTOR_RULE_MODULES[skillSlug];
  }
  return cartoonExplainerVideoDirectorRules;
}
