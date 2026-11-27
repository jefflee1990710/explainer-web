// System style labels for the video style-transfer picker.

import { STYLE_IDS, type StyleId } from "@/model/style-id";
import { stylesEn } from "@/util/i18n/messages/workspace/styles.en";
import { stylesZhHant } from "@/util/i18n/messages/workspace/styles.zh-Hant";

export type VideoStyleOption = {
  id: StyleId;
  label: string;
};

function labelFor(id: StyleId, isZh: boolean): string {
  const table = isZh ? stylesZhHant : stylesEn;
  const value = table[id];
  return typeof value === "string" && value.trim() ? value : id;
}

// Every system style, in catalog order, named for the canvas locale.
export function videoStyleOptions(isZh: boolean): VideoStyleOption[] {
  return STYLE_IDS.map((id) => ({ id, label: labelFor(id, isZh) }));
}
