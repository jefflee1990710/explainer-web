// CJK fonts libass draws for burned subtitles and the Text node (family + directory).

import { existsSync } from "node:fs";

export type SubtitleFont = { family: string; directory: string };

const SUBTITLE_FONTS: SubtitleFont[] = [
  { family: "PingFang HK", directory: "/System/Library/Fonts" },
  { family: "Noto Sans CJK TC", directory: "/usr/share/fonts/opentype/noto" },
  { family: "Noto Sans CJK TC", directory: "/usr/share/fonts/noto-cjk" },
];

export const MISSING_CJK_FONT = "燒錄中文字需要系統字型（PingFang 或 Noto Sans CJK）";

// The first installed CJK font libass can draw. Checked only when a job runs.
export function resolveSubtitleFont(): SubtitleFont | null {
  return SUBTITLE_FONTS.find((font) => existsSync(font.directory)) ?? null;
}

