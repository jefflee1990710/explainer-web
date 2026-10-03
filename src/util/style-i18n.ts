import type { PublicStyle } from "@/presentation/serialize";
import { en } from "@/util/i18n/messages/en";

type StyleId = PublicStyle["id"];

// Style labels stay English in every locale.
export function localizedStyleName(styleId: StyleId): string {
  return en.styles[styleId];
}
