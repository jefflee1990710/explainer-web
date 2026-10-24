import type { TranslateFn } from "@/util/i18n/translate";

// System director name in the active locale. Falls back to the stored English title.
export function localizedVideoType(t: TranslateFn, slug: string, fallback = ""): string {
  const key = `brief.videoTypes.${slug}`;
  const value = t(key);
  return value && value !== key ? value : fallback;
}

export function localizedVideoBlurb(t: TranslateFn, slug: string, fallback = ""): string {
  const key = `brief.videoTypeBlurbs.${slug}`;
  const value = t(key);
  return value && value !== key ? value : fallback;
}

// Suggested use case for a system director in the active locale. Falls back to stored English suggestedUseCase.
export function localizedVideoUseCase(t: TranslateFn, slug: string, fallback = ""): string {
  const key = `brief.videoTypeUseCases.${slug}`;
  const value = t(key);
  return value && value !== key ? value : fallback;
}
