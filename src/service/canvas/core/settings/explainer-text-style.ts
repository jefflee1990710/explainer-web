// The on-screen lettering line an Explainer start still gets for one text style.
// Canvas frame prompts keep `{{text_style}}` in its place, so a style change needs no re-plan.

import type { SettingsVars } from "@/model/canvas-settings";
import { SUBTITLE_LOOK_IDS } from "@/model/subtitle-look-id";
import { lookLineForOnScreenVideo, subtitleLookLine } from "@/service/director/subtitle-look";
import { promptPlaceholder, renderPromptTemplate } from "@/service/canvas/core/settings/template";

export const TEXT_STYLE_VAR = "text_style";

export function explainerTextStyleLine(look: string): string {
  return lookLineForOnScreenVideo(subtitleLookLine(look));
}

// Longest line any style can fill in, so a templated prompt is shortened with room for it.
export const MAX_TEXT_STYLE_LINE_CHARS = Math.max(...SUBTITLE_LOOK_IDS.map((id) => explainerTextStyleLine(id).length));

// Puts the placeholder where this style's line sits. False when the line is not in the prompt.
export function templateTextStyleLine(prompt: string, look: string): { prompt: string; templated: boolean } {
  const line = explainerTextStyleLine(look);
  if (!line || !prompt.includes(line)) return { prompt, templated: false };
  return { prompt: prompt.split(line).join(promptPlaceholder(TEXT_STYLE_VAR)), templated: true };
}

// Shortening may drop the placeholder; put it back on its own line.
export function ensureTextStylePlaceholder(prompt: string): string {
  const token = promptPlaceholder(TEXT_STYLE_VAR);
  return prompt.includes(token) ? prompt : `${prompt.trimEnd()}\n${token}`;
}

// Card text: swap {{text_style}} for the supplied line. Other placeholders stay.
// No line (no director style and no wired Setting) leaves the token in place.
export function promptWithTextStyle(text: string, vars: SettingsVars): string {
  if (!Object.prototype.hasOwnProperty.call(vars, TEXT_STYLE_VAR)) return text;
  return renderPromptTemplate(text, { [TEXT_STYLE_VAR]: vars[TEXT_STYLE_VAR] }).text;
}
