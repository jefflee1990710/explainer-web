import type { FramePosition, SpeechPace, VoLanguage } from "@/model/project";
import { FRAME_COST, FRAMES_COST } from "@/service/credit-costs";
import { chainsClipStarts, inheritsPreviousEnd } from "@/service/director/clip-continuity";
import { resolveSpeechPace } from "@/service/director/speech-pace";
import { mediaSrc } from "@/util/media-src";

export const TALKING_HEAD_SKILL_SLUG = "talking-head-director";
export const FULL_BODY_TALKING_HEAD_SKILL_SLUG = "full-body-talking-head-director";
export const TALKING_HEAD_MAX_CLIPS = 20;
export const TALKING_HEAD_MAX_SECONDS = 12;

// Medium pace: ~2.4 English words/s, ~4 Chinese characters/s.
const ENGLISH_WORDS_PER_SECOND = 2.4;
const CJK_CHARS_PER_SECOND = 4;
// MiniMax renders at least 5s. A shorter storyboard clip is sped up afterwards.
const PROVIDER_MIN_SECONDS = 5;

const TALKING_HEAD_SKILLS = new Set([TALKING_HEAD_SKILL_SLUG, FULL_BODY_TALKING_HEAD_SKILL_SLUG]);

export function isTalkingHeadSkill(skillSlug?: string) {
  return Boolean(skillSlug && TALKING_HEAD_SKILLS.has(skillSlug));
}

// Chained directors do not draw a start that copies the previous end still.
export function isInheritedTalkingHeadStart(
  skillSlug: string | undefined,
  clipNumber: number,
  position: FramePosition,
) {
  return inheritsPreviousEnd(skillSlug, clipNumber, position);
}

// A copied start is free. Clip 1, and surprise clip 2, still draw both stills.
export function talkingHeadFramesCost(skillSlug: string | undefined, clipNumber: number) {
  return inheritsPreviousEnd(skillSlug, clipNumber, "start") ? FRAME_COST : FRAMES_COST;
}

type CopyableFrame = {
  clipNumber: number;
  position: FramePosition;
  status: string;
  blobUrl?: string;
  outputUrl?: string;
  submittedAt?: string;
  error?: string;
};

// Fill a waiting start from the previous end once that still has a file.
export function withInheritedTalkingHeadStarts<T extends CopyableFrame>(
  frames: T[],
  skillSlug?: string,
): T[] {
  if (!chainsClipStarts(skillSlug)) return frames;
  return frames.map((frame) => {
    if (!isInheritedTalkingHeadStart(skillSlug, frame.clipNumber, frame.position)) return frame;
    const prev = frames.find(
      (item) => item.clipNumber === frame.clipNumber - 1 && item.position === "end",
    );
    if (!prev || prev.status !== "completed" || !mediaSrc(prev)) return frame;
    const { error: _error, ...rest } = frame;
    return {
      ...rest,
      status: "completed",
      blobUrl: prev.blobUrl,
      outputUrl: prev.outputUrl,
      submittedAt: prev.submittedAt || frame.submittedAt,
    } as T;
  });
}

// Sentence breaks: newlines, 。！？!?, and a period only when it ends a sentence.
// "Scro.io" stays one token because the period is not followed by whitespace.
export function splitTalkingHeadSentences(source: string): string[] {
  const text = source.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    const newline = ch === "\n";
    const cjkEnd = "。！？!?".includes(ch);
    const period = ch === "." && sentencePeriod(text, index);
    if (!newline && !cjkEnd && !period) continue;
    pushSpoken(sentences, text.slice(start, newline ? index : index + 1));
    start = index + 1;
  }
  pushSpoken(sentences, text.slice(start));
  return sentences;
}

function sentencePeriod(text: string, index: number) {
  const next = text[index + 1];
  return next === undefined || /\s/.test(next);
}

function pushSpoken(sentences: string[], raw: string) {
  const sentence = raw.trim();
  if (!sentence) return;
  const units = spokenUnits(sentence);
  if (units.cjk + units.words === 0) return;
  sentences.push(sentence);
}

export function spokenUnits(sentence: string) {
  const cjk = (sentence.match(/\p{Script=Han}/gu) || []).length;
  const latin = sentence
    .replace(/\p{Script=Han}/gu, " ")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();
  const words = latin ? latin.split(/\s+/).filter(Boolean).length : 0;
  return { cjk, words };
}

function paceDivisor(pace?: SpeechPace) {
  const speed = resolveSpeechPace(pace);
  if (speed === "slow") return 0.8;
  if (speed === "fast") return 1.2;
  return 1;
}

// Unrounded speaking time at the chosen pace. Used to balance clips.
function rawSpokenSeconds(text: string, pace?: SpeechPace) {
  const { cjk, words } = spokenUnits(text);
  return (cjk / CJK_CHARS_PER_SECOND + words / ENGLISH_WORDS_PER_SECOND) / paceDivisor(pace);
}

// Rounded seconds for one spoken line. Slow speaks longer; fast speaks shorter.
export function talkingHeadSeconds(sentence: string, pace?: SpeechPace) {
  return Math.max(1, Math.round(rawSpokenSeconds(sentence, pace)));
}

// Shot size named by a custom director visual. Nothing here forces a close-up.
export function talkingHeadShot(visual?: string) {
  const text = visual?.trim() || "";
  if (!text) return undefined;
  if (/full[- ]body|全身/i.test(text)) return "full-body";
  if (/medium close-up|中近景/i.test(text)) return "medium close-up";
  if (/close-up|特寫/i.test(text)) return "close-up";
  if (/wide shot|遠景/i.test(text)) return "wide shot";
  if (/medium shot|中景/i.test(text)) return "medium shot";
  return undefined;
}

// Spoken script the character will read — one englishVo line per planned clip.
export function talkingHeadScriptFromClips(clips: { englishVo?: string }[]) {
  return clips
    .map((clip) => clip.englishVo?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
}

// Instruction field must exist; spoken lines come from spokenScript.
export function talkingHeadSourceError(source: string) {
  return source.replace(/\s+/g, "").length === 0 ? "請輸入導演指示。" : undefined;
}

// Spoken script the character will read.
export function talkingHeadSpokenError(script: string, pace?: SpeechPace) {
  const sentences = splitTalkingHeadSentences(script);
  if (sentences.length === 0) return "請輸入角色要讀的講稿。";
  return talkingHeadPlanError(script, pace);
}

// Stop when the spoken script cannot fit in the clip budget.
export function talkingHeadPlanError(source: string, pace?: SpeechPace) {
  const sentences = splitTalkingHeadSentences(source);
  if (sentences.length === 0) return "請輸入角色要讀的講稿。";
  const total = Math.ceil(rawSpokenSeconds(source, pace));
  const limit = TALKING_HEAD_MAX_CLIPS * TALKING_HEAD_MAX_SECONDS;
  if (total > limit) {
    return `呢段稿大約 ${total} 秒，對鏡讀稿最多 ${limit} 秒。請刪短講稿後再試。`;
  }
  return undefined;
}

export type TalkingHeadClipPlan = {
  clipNumber: number;
  timeRange: string;
  durationSeconds: number;
  narrativeJob: string;
  explainerScene: string;
  startScene: string;
  endScene: string;
  motionCamera: string;
  englishVo: string;
  bgmSfx: string;
};

export function planTalkingHeadClips(input: {
  source: string;
  pace?: SpeechPace;
  language?: VoLanguage;
  // From the director visual, e.g. "full-body". Omitted when the director names no shot.
  shot?: string;
}): TalkingHeadClipPlan[] {
  const lines = balanceTalkingHeadLines(input.source, input.pace);
  const total = lines.length;
  const clips: TalkingHeadClipPlan[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const seconds = plannedClipSeconds(line, input.pace);
    const endScene = shotLine(input.language, "end", line, input.shot);
    const previousLine = index === 0 ? undefined : lines[index - 1];
    const startScene =
      index === 0 ? shotLine(input.language, "start", line, input.shot) : clips[index - 1].endScene;
    clips.push({
      clipNumber: index + 1,
      timeRange: `0–${seconds}s`,
      durationSeconds: seconds,
      narrativeJob: jobLine(input.language, index + 1, total),
      explainerScene: startScene,
      startScene,
      endScene,
      motionCamera: motionLine(input.language, seconds, line, previousLine, input.shot),
      englishVo: line,
      bgmSfx: input.language === "en" ? "none" : "無",
    });
  }
  return clips;
}

export function talkingHeadDurationHint(pace?: SpeechPace, skillSlug?: string) {
  const fullBody = skillSlug === FULL_BODY_TALKING_HEAD_SKILL_SLUG;
  return [
    fullBody ? "Full-body talking-head read: ignore the duration preset." : "Talking-head read: ignore the duration preset.",
    "The first user text is a DIRECTOR INSTRUCTION for staging and tone. The second user text is the SPOKEN SCRIPT — copy the words into englishVo verbatim.",
    "Do not force one sentence per clip. Group short lines and split long lines so each clip has a similar word count and the same speaking pace.",
    `Clip count is from 1 to ${TALKING_HEAD_MAX_CLIPS}. Each clip is ${PROVIDER_MIN_SECONDS}–${TALKING_HEAD_MAX_SECONDS}s.`,
    `durationSeconds follows Chinese characters / ${CJK_CHARS_PER_SECOND} + English words / ${ENGLISH_WORDS_PER_SECOND}, then ${paceNote(pace)}.`,
    fullBody
      ? "Locked full-body shot. Head, torso, and feet stay in frame. The character looks into the lens. Do not crop to a close-up."
      : "Do not pick a shot size. The director visual names the shot. The character looks into the lens the whole time.",
    fullBody
      ? "Clip 2+ startScene must copy the previous clip's endScene. Motion is the mouth, a small nod, and natural body gestures. Feet stay in frame. One bottom subtitle equal to that clip's spoken line, same on the start and end still."
      : "Clip 2+ startScene must copy the previous clip's endScene. Motion is mouth and a small nod only. One bottom subtitle equal to that clip's spoken line, same on the start and end still.",
  ].join(" ");
}

export function talkingHeadDirectorBlock(skillSlug?: string) {
  const fullBody = skillSlug === FULL_BODY_TALKING_HEAD_SKILL_SLUG;
  return [
    fullBody
      ? "This is a FULL-BODY TALKING-HEAD READ. The on-screen character faces the camera, head to feet in frame, and speaks. There is no cutaway and no second character."
      : "This is a TALKING-HEAD READ. The on-screen character faces the camera and speaks. There is no cutaway and no second character.",
    "The director instruction is planning notes only (tone, emphasis, must-have looks). It is NOT spoken.",
    "The spoken script is locked. Each clip's englishVo is a verbatim slice of that script. Do not paraphrase. Give every clip a similar amount of speech.",
    fullBody
      ? "Camera is a locked full-body shot. Do not crop to a close-up or a medium shot. Set and light stay identical across every clip. Clip 2 and after open on the previous clip's end still."
      : "Shot size follows the director visual. Do not pick a different shot. Camera, set, and light stay identical across every clip. Clip 2 and after open on the previous clip's end still.",
    "Bottom subtitle only: that clip's spoken line, nothing else written in the frame.",
  ].join(" ");
}

function paceNote(pace?: SpeechPace) {
  const speed = resolveSpeechPace(pace);
  if (speed === "slow") return "divide by 0.8 because the pace is slow";
  if (speed === "fast") return "divide by 1.2 because the pace is fast";
  return "keep that number because the pace is medium";
}

function jobLine(language: VoLanguage | undefined, index: number, total: number) {
  if (language === "en") return `clip ${index} of ${total}`;
  return `第 ${index} 段，共 ${total} 段`;
}

// At least the provider minimum, so a short line is not sped up after render.
function plannedClipSeconds(text: string, pace?: SpeechPace) {
  return Math.min(TALKING_HEAD_MAX_SECONDS, Math.max(PROVIDER_MIN_SECONDS, talkingHeadSeconds(text, pace)));
}

function shotLine(
  language: VoLanguage | undefined,
  moment: "start" | "end",
  line: string,
  shot?: string,
) {
  const camera = cameraClause(language, shot);
  if (language === "en") {
    const pose =
      moment === "start"
        ? "Character: centered, eyes into the lens, mouth just opening."
        : "Character: same pose, eyes into the lens, mouth just closed after the line.";
    return `${pose} Set: the same plain background in every clip, no new props. Light: soft and even, unchanged.${camera} Subtitle: one bottom line, exactly "${line}".`;
  }
  const pose =
    moment === "start"
      ? "角色：置中，望住鏡頭，準備開口。"
      : "角色：同一姿勢，望住鏡頭，呢句講完、口部合上。";
  return `${pose}場景：全程同一個簡潔背景，冇新道具。光：柔和均勻，不變。${camera}字幕：畫面底部一行，逐字係「${line}」。`;
}

function cameraClause(language: VoLanguage | undefined, shot?: string) {
  const size = shot?.trim();
  if (!size) return "";
  const fullBody = size === "full-body";
  if (language === "en") {
    return fullBody
      ? " Camera: locked full-body, character centered, head to feet in frame."
      : ` Camera: locked ${size}, character centered.`;
  }
  return fullBody
    ? "鏡頭：鎖定全身，角色置中，頭到腳都在畫面內。"
    : `鏡頭：鎖定${shotLabel(size)}、角色置中。`;
}

function shotLabel(shot: string) {
  if (shot === "full-body") return "全身";
  if (shot === "medium close-up") return "中近景";
  if (shot === "close-up") return "特寫";
  if (shot === "wide shot") return "遠景";
  if (shot === "medium shot") return "中景";
  return shot;
}

// Clauses, then word groups, packed so each clip carries a similar amount of speech.
function balanceTalkingHeadLines(source: string, pace?: SpeechPace) {
  const pieces = spokenPieces(source, pace);
  if (pieces.length <= 1) return pieces;
  const weights = pieces.map((piece) => rawSpokenSeconds(piece, pace));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return evenRanges(weights, total).map(([start, end]) => joinSpoken(pieces.slice(start, end)));
}

function spokenPieces(source: string, pace?: SpeechPace) {
  const pieces: string[] = [];
  for (const sentence of splitTalkingHeadSentences(source)) {
    for (const clause of splitClauses(sentence)) {
      for (const piece of splitLongPiece(clause, pace)) {
        pushSpoken(pieces, piece);
      }
    }
  }
  return pieces;
}

function splitClauses(sentence: string) {
  const parts = sentence
    .split(/(?<=[，,、;；])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [sentence];
}

function splitLongPiece(text: string, pace?: SpeechPace) {
  const trimmed = text.trim();
  if (rawSpokenSeconds(trimmed, pace) <= 4) return [trimmed];
  const parts = Math.max(2, Math.ceil(rawSpokenSeconds(trimmed, pace) / 4));
  const cjkRun = /[\u4e00-\u9fff]/.test(trimmed) && !/\s/.test(trimmed);
  if (cjkRun) {
    const chars = [...trimmed];
    const size = Math.ceil(chars.length / parts);
    const chunks: string[] = [];
    for (let index = 0; index < chars.length; index += size) {
      chunks.push(chars.slice(index, index + size).join(""));
    }
    return chunks;
  }
  const words = trimmed.split(/\s+/);
  const size = Math.ceil(words.length / parts);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += size) {
    chunks.push(words.slice(index, index + size).join(" "));
  }
  return chunks;
}

// Pick the clip count whose real slices are closest in length, each at least 5s.
function evenRanges(weights: number[], total: number): Array<[number, number]> {
  if (weights.length <= 1 || total <= TALKING_HEAD_MAX_SECONDS) return [[0, weights.length]];
  const minClips = Math.max(1, Math.ceil(total / TALKING_HEAD_MAX_SECONDS));
  const maxClips = Math.min(
    TALKING_HEAD_MAX_CLIPS,
    weights.length,
    Math.max(1, Math.floor(total / (PROVIDER_MIN_SECONDS - 0.45))),
  );
  let best: Array<[number, number]> | undefined;
  let bestCost = Number.POSITIVE_INFINITY;
  for (let groups = minClips; groups <= Math.max(minClips, maxClips); groups += 1) {
    const ranges = partitionEven(weights, groups);
    const seconds = ranges.map(([start, end]) => weightSum(weights, start, end));
    if (seconds.some((value) => value > TALKING_HEAD_MAX_SECONDS)) continue;
    if (groups > 1 && seconds.some((value) => value < PROVIDER_MIN_SECONDS - 0.45)) continue;
    const mean = total / groups;
    const spread = Math.max(...seconds) - Math.min(...seconds);
    // 7s keeps speech above the 5s render floor and the subtitle to about two short lines.
    const cost = spread * 4 + Math.abs(mean - 7);
    if (cost < bestCost) {
      bestCost = cost;
      best = ranges;
    }
  }
  return best ?? [[0, weights.length]];
}

function weightSum(weights: number[], start: number, end: number) {
  let sum = 0;
  for (let index = start; index < end; index += 1) sum += weights[index];
  return sum;
}

function partitionEven(weights: number[], groups: number): Array<[number, number]> {
  const count = weights.length;
  const prefix = [0];
  for (const weight of weights) prefix.push(prefix[prefix.length - 1] + weight);
  const ideal = prefix[count] / groups;
  const cost = Array.from({ length: count + 1 }, () => Array<number>(groups + 1).fill(Number.POSITIVE_INFINITY));
  const choice = Array.from({ length: count + 1 }, () => Array<number>(groups + 1).fill(-1));
  cost[0][0] = 0;
  for (let end = 1; end <= count; end += 1) {
    for (let group = 1; group <= Math.min(groups, end); group += 1) {
      for (let start = group - 1; start < end; start += 1) {
        if (!Number.isFinite(cost[start][group - 1])) continue;
        const seconds = prefix[end] - prefix[start];
        const next = cost[start][group - 1] + (seconds - ideal) ** 2;
        if (next < cost[end][group]) {
          cost[end][group] = next;
          choice[end][group] = start;
        }
      }
    }
  }
  const ranges: Array<[number, number]> = [];
  let end = count;
  for (let group = groups; group >= 1; group -= 1) {
    const start = choice[end][group];
    if (start < 0) return [[0, count]];
    ranges.push([start, end]);
    end = start;
  }
  ranges.reverse();
  return ranges;
}

function joinSpoken(parts: string[]) {
  let out = "";
  for (const part of parts) {
    const piece = part.trim();
    if (!piece) continue;
    if (!out) {
      out = piece;
      continue;
    }
    const cjk = /[\u4e00-\u9fff，。！？、；：]$/.test(out) && /^[\u4e00-\u9fff]/.test(piece);
    out += cjk ? piece : ` ${piece}`;
  }
  return out;
}

function motionLine(
  language: VoLanguage | undefined,
  seconds: number,
  line: string,
  previousLine?: string,
  shot?: string,
) {
  const fullBody = shot === "full-body";
  if (language === "en") {
    const subtitle = previousLine
      ? `Bottom subtitle changes from "${previousLine}" to "${line}".`
      : `Bottom subtitle stays "${line}".`;
    const move = fullBody
      ? "speaks this line, mouth moving, one small nod, and a natural gesture; feet stay in frame; camera stays locked."
      : "speaks this line, mouth moving, one small nod; camera stays locked.";
    return `0–${seconds}s the character looks into the lens and ${move} ${subtitle}`;
  }
  const subtitle = previousLine
    ? `底部字幕由「${previousLine}」換成「${line}」。`
    : `底部字幕保持「${line}」。`;
  const move = fullBody
    ? "口型跟住講，輕微點頭，身體有自然手勢；頭到腳留喺畫面；鏡頭鎖定。"
    : "口型跟住講，輕微點頭；鏡頭鎖定。";
  return `0–${seconds}s 望住鏡頭讀出呢句，${move}${subtitle}`;
}
