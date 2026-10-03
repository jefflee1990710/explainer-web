import { isStyleId } from "@/model/style-id";
import { en } from "@/util/i18n/messages/en";

// English catalog label for a system style id. Custom cards use `style.name` instead.
export function localizedStyleName(styleId: string): string {
  if (!isStyleId(styleId)) return styleId;
  return en.styles[styleId];
}
