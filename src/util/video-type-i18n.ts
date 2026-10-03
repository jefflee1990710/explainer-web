import { en } from "@/util/i18n/messages/en";

// Director type labels stay English in every locale.
export function localizedVideoType(slug: string, fallback = ""): string {
  const names = en.brief.videoTypes as Record<string, string>;
  return names[slug] || fallback;
}
