import type { TranslateFn } from "@/util/i18n";

export type SkillGuide = {
  voice: string;
  structure: string;
  picture: string;
  frames: string;
};

export const SKILL_GUIDE_FIELDS = [
  { key: "voice", labelKey: "brief.skillGuide.labels.voice" },
  { key: "structure", labelKey: "brief.skillGuide.labels.structure" },
  { key: "picture", labelKey: "brief.skillGuide.labels.picture" },
  { key: "frames", labelKey: "brief.skillGuide.labels.frames" },
] as const;

// Create-form cheat sheet for the selected director, in the current UI locale.
export function skillGuideFor(t: TranslateFn, slug: string): SkillGuide | undefined {
  const prefix = `brief.skillGuide.types.${slug}`;
  const voice = t(`${prefix}.voice`);
  if (voice === `${prefix}.voice`) return undefined;
  return {
    voice,
    structure: t(`${prefix}.structure`),
    picture: t(`${prefix}.picture`),
    frames: t(`${prefix}.frames`),
  };
}
