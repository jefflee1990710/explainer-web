import type { PublicStyle } from "@/lib/serialize";
import type { TranslateFn } from "@/lib/i18n";

type StyleId = PublicStyle["id"];

export function localizedStyleName(t: TranslateFn, styleId: StyleId): string {
  return t(`styles.${styleId}`);
}

export function localizedStyleDescription(t: TranslateFn, styleId: StyleId): string {
  return t(`styleDescriptions.${styleId}`);
}
