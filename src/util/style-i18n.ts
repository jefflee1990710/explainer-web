import { isStyleId } from "@/model/style-id";
import { en } from "@/util/i18n/messages/en";

// Style labels stay English in every locale. A user style id has no catalog label.
export function localizedStyleName(styleId: string): string {
  if (!isStyleId(styleId)) return styleId;
  return en.styles[styleId];
}
