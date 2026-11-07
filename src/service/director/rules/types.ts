import type { DirectorSlug } from "@/model/director";
import type { PerformanceSlots } from "@/model/director-performance";
import type { AspectRatio, VoLanguage } from "@/model/project";
import type { SurpriseSubtitlePlace } from "@/service/director/surprise-interview";

export type DirectorPhaseABlockInput = {
  aspectRatio?: AspectRatio;
  hasCharacter?: boolean;
  smoothMotion?: boolean;
  realistic?: boolean;
  backgroundId?: string;
  customBackground?: boolean;
  hasLogo?: boolean;
  lockBookendLength?: boolean;
  sceneTextEnabled?: boolean;
  subtitleOverlay?: boolean;
  performance?: PerformanceSlots;
  styles?: Array<{ id: string; name: string }>;
};

export type DirectorPhaseBMotionInput = {
  smoothMotion?: boolean;
  realistic?: boolean;
  clipNumber?: number;
  place?: SurpriseSubtitlePlace;
  performance?: PerformanceSlots;
};

export type DirectorRuleModule = {
  slug: DirectorSlug;
  allowsInventedProps: boolean;
  phaseASceneDetailBlock(options: { realistic?: boolean; selfShot?: boolean }): string;
  phaseAKeyframeDeltaBlock(options: {
    language?: VoLanguage;
    hasCharacter?: boolean;
    steadyStills?: boolean;
  }): string;
  phaseADirectorBlock(options: DirectorPhaseABlockInput): string;
  phaseBMotionRules(options: DirectorPhaseBMotionInput): string;
  phaseBDetailRules(options: {
    realistic?: boolean;
    selfShot?: boolean;
    narratorOnly?: boolean;
  }): string;
};
