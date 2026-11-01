/** Fixed system director slugs for Create use-case lists (custom directors excluded). */

export const VIDEO_USE_CASES = ["explainer", "talking-head"] as const;
export type VideoUseCase = (typeof VIDEO_USE_CASES)[number];

export const EXPLAINER_SYSTEM_SKILL_SLUGS = [
  "paper-cutout-explainer-video-director",
  "cartoon-explainer-video-director",
] as const;

export const TALKING_HEAD_SYSTEM_SKILL_SLUGS = ["talking-head-director"] as const;

export const USE_CASE_DEFAULT_SKILL_SLUG: Record<VideoUseCase, string> = {
  explainer: "paper-cutout-explainer-video-director",
  "talking-head": "talking-head-director",
};

export const USE_CASE_LIST_PATH: Record<VideoUseCase, string> = {
  explainer: "/app/explainers",
  "talking-head": "/app/talking-heads",
};

export function isVideoUseCase(value: string | null | undefined): value is VideoUseCase {
  return value === "explainer" || value === "talking-head";
}

export function skillSlugsForUseCase(useCase: VideoUseCase): readonly string[] {
  return useCase === "explainer"
    ? EXPLAINER_SYSTEM_SKILL_SLUGS
    : TALKING_HEAD_SYSTEM_SKILL_SLUGS;
}

export function videoMatchesUseCase(
  skillSlug: string | null | undefined,
  useCase: VideoUseCase,
): boolean {
  if (!skillSlug) return false;
  return skillSlugsForUseCase(useCase).includes(skillSlug);
}

export function filterSkillsForUseCase<T extends { slug: string; isCustom?: boolean }>(
  skills: readonly T[],
  useCase: VideoUseCase,
): T[] {
  const allowed = new Set(skillSlugsForUseCase(useCase));
  return skills.filter((skill) => !skill.isCustom && allowed.has(skill.slug));
}

export function defaultSkillSlugForUseCase(
  useCase: VideoUseCase,
  offered: ReadonlyArray<{ slug: string }>,
): string {
  const preferred = USE_CASE_DEFAULT_SKILL_SLUG[useCase];
  if (offered.some((skill) => skill.slug === preferred)) return preferred;
  return offered[0]?.slug || preferred;
}

export function newVideoPathForUseCase(
  useCase: VideoUseCase,
  options?: { projectId?: string },
): string {
  const params = new URLSearchParams();
  params.set("useCase", useCase);
  if (options?.projectId) params.set("projectId", options.projectId);
  return `/app/videos/new?${params.toString()}`;
}

export function parseUseCaseParam(value: string | null | undefined): VideoUseCase | undefined {
  return isVideoUseCase(value) ? value : undefined;
}
