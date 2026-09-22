import type { PublicStyle } from "@/presentation/serialize";
import type { TranslateFn } from "@/util/i18n";

type StyleId = PublicStyle["id"];

export function localizedStyleName(t: TranslateFn, styleId: StyleId): string {
  return t(`styles.${styleId}`);
}

export function localizedStyleDescription(t: TranslateFn, styleId: StyleId): string {
  return t(`styleDescriptions.${styleId}`);
}
