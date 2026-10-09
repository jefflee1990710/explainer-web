import { generateText } from "ai";
import type { Project, StoryboardRow } from "@/model/project";
import { directorModel } from "@/service/director/model";

// Characters that only appear in Hong Kong colloquial writing.
const COLLOQUIAL = /[嘅啲咗喺喎㗎咩嚟搵畀靚冇哋唔啦喇囉嘞]/;

// Longer phrases first so 唔好 does not become 不好.
const PHRASES: Array<[string, string]> = [
  ["唔好", "不要"],
  ["唔係", "不是"],
  ["點解", "為什麼"],
  ["點樣", "怎樣"],
  ["而家", "現在"],
  ["嗰啲", "那些"],
  ["呢啲", "這些"],
  ["嗰個", "那個"],
  ["呢個", "這個"],
  ["佢哋", "他們"],
  ["我哋", "我們"],
  ["你哋", "你們"],
  ["冇人", "沒有人"],
  ["邊個", "誰"],
  ["幾多", "多少"],
  ["咁樣", "這樣"],
];

const CHAR_MAP: Record<string, string> = {
  嘅: "的",
  啲: "些",
  咗: "了",
  喺: "在",
  喎: "",
  㗎: "",
  咩: "嗎",
  嚟: "來",
  搵: "找",
  畀: "給",
  靚: "漂亮",
  冇: "沒有",
  哋: "們",
  唔: "不",
  啦: "",
  喇: "",
  囉: "",
  嘞: "",
};

export function looksColloquial(line: string) {
  return COLLOQUIAL.test(line);
}

// Local fallback when the rewrite model is unavailable. Spoken lines stay
// colloquial; this only feeds the on-canvas spelling.
export function toWrittenChinese(line: string) {
  const text = line.trim();
  if (!text || !looksColloquial(text)) return line;
  // 唔好 means "not good" before 嘅 or punctuation (市況唔好嘅), otherwise "don't".
  let next = text.replace(/唔好(?=嘅|[，。！？,.!?\s]|$)/g, "不好");
  for (const [from, to] of PHRASES) next = next.replaceAll(from, to);
  next = [...next].map((ch) => (ch in CHAR_MAP ? CHAR_MAP[ch] : ch)).join("");
  return next.replace(/\s{2,}/g, " ").trim() || line;
}

function unwrapLines(text: string, count: number) {
  const rows = text
    .trim()
    .split(/\n+/)
    .map((row) => row.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  if (rows.length !== count) return undefined;
  return rows;
}

// One rewrite for every distinct colloquial line. Same order comes back.
export async function rewriteToWrittenChinese(lines: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(lines.map((line) => line.trim()).filter(looksColloquial))];
  const mapped = new Map<string, string>();
  if (unique.length === 0) return mapped;
  const { text } = await generateText({
    model: directorModel(),
    system: [
      "Rewrite each Hong Kong colloquial Cantonese line into Traditional Chinese 書面語.",
      "Keep the meaning, names, numbers, and English words exactly.",
      "Return one rewritten line per input line, same order, nothing else.",
      "If a line is already 書面語 or English, copy it unchanged.",
    ].join("\n"),
    prompt: unique.map((line, index) => `${index + 1}. ${line}`).join("\n"),
  });
  const rows = unwrapLines(text, unique.length);
  if (!rows) throw new Error("書面語行數不符");
  unique.forEach((line, index) => mapped.set(line, rows[index]));
  return mapped;
}

function writtenLine(line: string | undefined, rewritten: Map<string, string>) {
  if (!line) return line;
  return rewritten.get(line.trim()) || toWrittenChinese(line);
}

function writeClip(clip: StoryboardRow, rewritten: Map<string, string>): StoryboardRow {
  return {
    ...clip,
    englishVo: writtenLine(clip.englishVo, rewritten) || clip.englishVo,
    ...(clip.startVo ? { startVo: writtenLine(clip.startVo, rewritten) } : {}),
    ...(clip.endVo ? { endVo: writtenLine(clip.endVo, rewritten) } : {}),
  };
}

// Copy used only to paint frames. The stored voiceover stays colloquial.
export async function withWrittenCanvas(project: Project): Promise<Project> {
  if (project.language !== "yue" || !project.phaseA) return project;
  const clips = project.phaseA.clips;
  const spoken = clips.flatMap((clip) => [clip.englishVo, clip.startVo, clip.endVo].filter(Boolean) as string[]);
  let rewritten = new Map<string, string>();
  if (spoken.some(looksColloquial)) {
    try {
      rewritten = await rewriteToWrittenChinese(spoken);
    } catch (error) {
      console.error("[written-chinese] rewrite failed; using local fallback", error);
    }
  }
  return {
    ...project,
    phaseA: { ...project.phaseA, clips: clips.map((clip) => writeClip(clip, rewritten)) },
  };
}
