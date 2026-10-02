import { skillsCollection } from "@/dao";
import { PROFILE_KEYS, type DirectorProfile, type Skill } from "@/model/skill";
import { asRunSkill, isCustomSkill } from "@/service/director/behavior-slug";
import { PROFILE_LABELS_EN } from "@/service/director/profile";

// The custom director's system template no longer exists; callers treat it as a missing skill.
export class MissingTemplateError extends Error {
  constructor() {
    super("找不到風格");
    this.name = "MissingTemplateError";
  }
}

// Prompt section appended to the template for a custom director; empty when nothing is set.
export function customDirectorBlock(profile: DirectorProfile | undefined, extra: string | undefined): string {
  const sections = PROFILE_KEYS.filter((key) => profile?.[key]?.trim()).map(
    (key) => `## ${PROFILE_LABELS_EN[key]}\n${profile![key].trim()}`,
  );
  if (extra?.trim()) sections.push(`## Extra instructions\n${extra.trim()}`);
  if (!sections.length) return "";
  return `\n\n# Custom director adjustments\nThe user customised this director. Follow these on top of the guidance above; where they conflict, these win — except hard limits the platform enforces (clip counts, cast size, durations, output schema).\n\n${sections.join("\n\n")}`;
}

// System template by slug (deleted state ignored, same as loading a video's skill by id).
async function loadSystemTemplate(slug: string): Promise<Skill | null> {
  const skills = await skillsCollection();
  return (await skills.findOne({ slug, ownerClerkUserId: { $exists: false } })) as Skill | null;
}

// Skill used by Phase A / B: custom directors run on the hidden template prompt plus their adjustments.
export async function resolveRunSkill(
  skill: Skill,
  loadTemplate: (slug: string) => Promise<Skill | null> = loadSystemTemplate,
): Promise<Skill> {
  if (!isCustomSkill(skill)) return asRunSkill(skill);
  const baseSlug = skill.baseSlug || "";
  const template = baseSlug ? await loadTemplate(baseSlug) : null;
  if (!template) throw new MissingTemplateError();
  return {
    ...skill,
    slug: baseSlug,
    systemPrompt: `${template.systemPrompt}${customDirectorBlock(skill.customProfile, skill.extraInstructions)}`,
    references: template.references,
  };
}
