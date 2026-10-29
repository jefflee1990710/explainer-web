import { skillsCollection } from "@/dao";
import { PROFILE_KEYS, type DirectorProfile, type Skill } from "@/model/skill";
import { asRunSkill, isCustomSkill } from "@/service/director/behavior-slug";
import {
  compileDirectorPrompts,
  DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
  normalizeDirectorBehavior,
} from "@/service/director/compile-director-prompts";
import { emptyProfile, parseSystemProfile, PROFILE_LABELS_EN } from "@/service/director/profile";

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

// System template by slug (used only as legacy fallback for old fork docs that had no standalone systemPrompt).
async function loadSystemTemplate(slug: string): Promise<Skill | null> {
  const skills = await skillsCollection();
  return (await skills.findOne({ slug, ownerClerkUserId: { $exists: false } })) as Skill | null;
}

// Skill used by Phase A / B: standalone custom directors carry their own compiled systemPrompt,
// references, behavior, profile, and performance so changes to built-in directors never affect them.
export async function resolveRunSkill(
  skill: Skill,
  loadTemplate: (slug: string) => Promise<Skill | null> = loadSystemTemplate,
): Promise<Skill> {
  if (!isCustomSkill(skill)) return asRunSkill(skill);

  // Standalone custom director: carries its own behavior and compiled systemPrompt (no baseSlug coupling).
  if (!skill.baseSlug && (skill.systemPrompt?.trim() || skill.behavior)) {
    if (skill.systemPrompt?.trim()) {
      return {
        ...skill,
        behavior: normalizeDirectorBehavior(skill.behavior, DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR),
        systemPrompt: `${skill.systemPrompt}${customDirectorBlock(skill.customProfile, skill.extraInstructions)}`,
      };
    }
    const profile =
      skill.customProfile ?? (skill.profile ? parseSystemProfile(skill.profile) : emptyProfile());
    const compiled = compileDirectorPrompts({
      slug: skill.slug,
      title: skill.title,
      description: skill.description,
      behavior: normalizeDirectorBehavior(skill.behavior),
      profile,
      performance: skill.customPerformance ?? skill.performance?.en,
      extraInstructions: skill.extraInstructions,
    });
    return {
      ...skill,
      systemPrompt: compiled.systemPrompt,
      references: compiled.references,
    };
  }

  const baseSlug = skill.baseSlug || "";
  const template = baseSlug ? await loadTemplate(baseSlug) : null;
  if (!template) throw new MissingTemplateError();
  return {
    ...skill,
    slug: baseSlug,
    systemPrompt: `${template.systemPrompt}${customDirectorBlock(skill.customProfile, skill.extraInstructions)}`,
    references: template.references,
    performance: template.performance,
  };
}
