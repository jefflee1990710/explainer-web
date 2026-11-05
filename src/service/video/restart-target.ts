import {
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-slugs";
import {
  videoMatchesUseCase,
  type VideoUseCase,
} from "@/service/video/use-case";

export type VideoRestartTarget =
  | { kind: "redirect"; href: "/app/scroswap" | "/app/teleport" }
  | { kind: "form"; useCase?: VideoUseCase };

/** Infer whether a video's `skillSlug` belongs to the Explainer or Talking Head creation form. */
export function inferVideoUseCaseFromSkillSlug(
  skillSlug?: string | null,
): VideoUseCase | undefined {
  if (!skillSlug) return undefined;
  if (videoMatchesUseCase(skillSlug, "talking-head")) return "talking-head";
  if (videoMatchesUseCase(skillSlug, "explainer")) return "explainer";
  return undefined;
}

/**
 * Determine where the OpenCut editor's Restart ("重新開始") button should take the user:
 * - Scro Swap standalone video -> `/app/scroswap`
 * - Teleport standalone video -> `/app/teleport`
 * - Explainer / Talking Head / Studio video -> reopen the corresponding brief form
 */
export function resolveVideoRestartTarget(
  video: { skillSlug?: string | null },
  explicitUseCase?: VideoUseCase,
): VideoRestartTarget {
  const slug = video.skillSlug?.trim();
  if (slug === SCRO_SWAP_STANDALONE_SKILL_SLUG) {
    return { kind: "redirect", href: "/app/scroswap" };
  }
  if (slug === TELEPORT_STANDALONE_SKILL_SLUG) {
    return { kind: "redirect", href: "/app/teleport" };
  }
  return {
    kind: "form",
    useCase: explicitUseCase ?? inferVideoUseCaseFromSkillSlug(slug),
  };
}
