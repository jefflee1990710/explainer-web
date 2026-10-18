import sharp from "sharp";
import type { FramePosition, Project } from "@/model/project";
import type { SubtitleLook } from "@/model/subtitle-look-id";
import { splitCjkLineInTwo } from "@/service/director/cjk-line-split";
import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
  isDualBeatSkill,
  joinVoBeats,
} from "@/service/director/dual-beat";
import { resolveSceneText, storyboardAsksForSubtitle } from "@/service/director/scene-text";
import { skillBansNarration, skillForcesSceneText } from "@/service/director/skill-rules";
import { isSilentSpokenLine, subtitleText } from "@/service/director/spoken-line";
import { usesSteadyStills } from "@/service/director/steady-stills";
import { resolveSubtitleLook } from "@/service/director/subtitle-look";
import { usesTalkingHeadSubtitleOverlay } from "@/service/director/subtitle-plate";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import { toWrittenChinese } from "@/service/director/written-chinese";
import type { RenderableStyle } from "@/service/style/renderable-style";

const GUIDE_WIDTH = 960;
const GUIDE_HEIGHT = 360;
const FONT_FAMILY =
  "Arial, Helvetica, 'PingFang HK', 'PingFang TC', 'Noto Sans CJK TC', 'Heiti TC', sans-serif";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isMostlyCjk(text: string): boolean {
  const cjk = (text.match(/\p{Script=Han}/gu) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return cjk > 0 && cjk >= latin;
}

// Split a spoken subtitle into 1 or 2 balanced lines so neither strip is blank or cramped.
export function splitSubtitleGuideLines(raw: string): string[] {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return [];

  if (isMostlyCjk(text)) {
    if ([...text].length < 6) return [text];
    return splitCjkLineInTwo(text).filter(Boolean);
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) return [text];

  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function extractSubtitleForGuide(input: {
  scene: string;
  spoken?: string;
  enabled: boolean;
  talkingHead?: boolean;
}): string | undefined {
  if (!input.enabled) return undefined;
  const scene = input.scene || "";
  const enMatch = scene.match(/Subtitle(?:\s*\(spell exactly\))?:[^"]*"([^"]+)"/i);
  if (enMatch?.[1]?.trim()) return enMatch[1].trim();
  const zhMatch = scene.match(/(?:Subtitle|字幕)[：:][^「]*「([^」]+)」/u);
  if (zhMatch?.[1]?.trim()) return zhMatch[1].trim();

  if (input.talkingHead && !storyboardAsksForSubtitle(scene)) return undefined;
  const spoken = input.spoken?.trim() || "";
  if (!spoken || isSilentSpokenLine(spoken)) return undefined;
  return spoken;
}

export function extractProjectFrameSubtitle(
  project: Project,
  clipNumber: number,
  position: FramePosition,
  style?: RenderableStyle,
): string | undefined {
  const sceneText = resolveSceneText(project);
  if (!sceneText.enabled) return undefined;
  if (usesTalkingHeadSubtitleOverlay({ skillSlug: project.skillSlug, styleId: project.styleId })) {
    return undefined;
  }
  if (skillForcesSceneText(project.skillSlug)) return undefined;
  const row = project.phaseA?.clips.find((c) => c.clipNumber === clipNumber);
  if (!row) return undefined;

  const dualBeat = isDualBeatSkill(project.skillSlug);
  const steady = style ? usesSteadyStills(project.skillSlug, style) : false;
  const rawSpoken = dualBeat
    ? steady
      ? joinVoBeats(clipStartVo(row), clipEndVo(row))
      : position === "start"
        ? clipStartVo(row)
        : clipEndVo(row)
    : row.englishVo;
  const spoken = skillBansNarration(project.skillSlug) ? subtitleText(rawSpoken) : rawSpoken;
  const rawScene = position === "start" ? clipStartScene(row) : clipEndScene(row);
  const writtenScene = project.language === "yue" ? toWrittenChinese(rawScene) : rawScene;
  const writtenSpoken = project.language === "yue" ? toWrittenChinese(spoken) : spoken;

  return extractSubtitleForGuide({
    scene: writtenScene,
    spoken: writtenSpoken,
    enabled: sceneText.enabled,
    talkingHead: isTalkingHeadSkill(project.skillSlug),
  });
}

function fontSizeForLine(line: string): number {
  const len = [...line].length;
  const cjk = isMostlyCjk(line);
  if (cjk) {
    if (len <= 10) return 60;
    if (len <= 14) return 50;
    return 40;
  }
  if (len <= 20) return 56;
  if (len <= 28) return 46;
  if (len <= 36) return 38;
  return 32;
}

export function renderSubtitleGuideSvg(input: { line: string; look?: SubtitleLook | string | null }): string {
  const lines = splitSubtitleGuideLines(input.line);
  const look = resolveSubtitleLook(input.look);
  const line1 = lines[0] || "";
  const line2 = lines[1] || "";
  const size1 = fontSizeForLine(line1);
  const size2 = line2 ? fontSizeForLine(line2) : size1;
  const fontSize = Math.min(size1, size2);

  if (look === "clean" && line2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${GUIDE_WIDTH}" height="${GUIDE_HEIGHT}" viewBox="0 0 ${GUIDE_WIDTH} ${GUIDE_HEIGHT}">
  <rect width="${GUIDE_WIDTH}" height="${GUIDE_HEIGHT}" fill="#f4f4f0"/>
  <rect x="48" y="52" width="864" height="114" rx="6" fill="#141414"/>
  <text x="480" y="126" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="800" font-size="${fontSize}" fill="#ffffff">${escapeXml(line1)}</text>
  <rect x="36" y="186" width="888" height="114" rx="6" fill="#5ce65c"/>
  <text x="480" y="260" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="800" font-size="${fontSize}" fill="#111111">${escapeXml(line2)}</text>
</svg>`;
  }

  if (line2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${GUIDE_WIDTH}" height="${GUIDE_HEIGHT}" viewBox="0 0 ${GUIDE_WIDTH} ${GUIDE_HEIGHT}">
  <rect width="${GUIDE_WIDTH}" height="${GUIDE_HEIGHT}" fill="#ffffff"/>
  <rect x="36" y="44" width="888" height="272" rx="12" fill="#141414"/>
  <text x="480" y="150" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="800" font-size="${fontSize}" fill="#ffffff">${escapeXml(line1)}</text>
  <text x="480" y="246" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="800" font-size="${fontSize}" fill="#ffe14d">${escapeXml(line2)}</text>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${GUIDE_WIDTH}" height="${GUIDE_HEIGHT}" viewBox="0 0 ${GUIDE_WIDTH} ${GUIDE_HEIGHT}">
  <rect width="${GUIDE_WIDTH}" height="${GUIDE_HEIGHT}" fill="#f4f4f0"/>
  <rect x="48" y="110" width="864" height="140" rx="8" fill="#141414"/>
  <text x="480" y="198" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="800" font-size="${fontSize}" fill="#ffffff">${escapeXml(line1)}</text>
</svg>`;
}

export async function renderSubtitleGuideDataUrl(input: {
  line: string;
  look?: SubtitleLook | string | null;
}): Promise<string> {
  const svg = renderSubtitleGuideSvg(input);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function subtitleGuidePromptLine(imageIndex: number, line: string): string {
  const lines = splitSubtitleGuideLines(line);
  const layout =
    lines.length === 2 ? `two lines ("${lines[0]}" / "${lines[1]}")` : `one line ("${lines[0] || line}")`;
  return `SUBTITLE SPELLING GUIDE: attached image ${imageIndex} is a font-rendered guide showing the exact subtitle spelling and ${layout}. Copy every character and line break from attached image ${imageIndex} verbatim (no typos, no doubled or missing letters, no blank strip) and style the subtitle in the scene using the Look line above.`;
}
