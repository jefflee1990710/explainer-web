import type { TranslateFn } from "@/util/i18n";

// Video-type label for the current UI locale. Falls back when the slug has no message.
export function localizedVideoType(t: TranslateFn, slug: string, fallback: string): string {
  const key = `brief.videoTypes.${slug}`;
  const value = t(key);
  return value === key ? fallback : value;
}
