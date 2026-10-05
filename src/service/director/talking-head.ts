import type { FramePosition, SpeechPace, VoLanguage } from "@/model/project";
import { FRAME_COST, FRAMES_COST } from "@/service/credit-costs";
import { chainsClipStarts, inheritsPreviousEnd } from "@/service/director/clip-continuity";
import { resolveSpeechPace } from "@/service/director/speech-pace";
import { mediaSrc } from "@/util/media-src";

export const TALKING_HEAD_SKILL_SLUG = "talking-head-director";
export const TALKING_HEAD_MAX_CLIPS = 20;
export const TALKING_HEAD_MAX_SECONDS = 12;

// Medium pace: ~2.4 English words/s, ~4 Chinese characters/s.
const ENGLISH_WORDS_PER_SECOND = 2.4;
const CJK_CHARS_PER_SECOND = 4;

export function isTalkingHeadSkill(skillSlug?: string) {
  return skillSlug === TALKING_HEAD_SKILL_SLUG;
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

// One sentence per clip. Newlines and 。！？.!? all start a new sentence.
export function splitTalkingHeadSentences(source: string): string[] {
  const text = source.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const sentences: string[] = [];
  for (const line of text.split(/\n+/)) {
    for (const part of line.split(/(?<=[。！？!?\.])/u)) {
      const sentence = part.trim();
      if (!sentence) continue;
      const units = spokenUnits(sentence);
      if (units.cjk + units.words === 0) continue;
      sentences.push(sentence);
    }
  }
  return sentences;
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

// Rounded seconds for one sentence. Slow speaks longer; fast speaks shorter.
export function talkingHeadSeconds(sentence: string, pace?: SpeechPace) {
  const { cjk, words } = spokenUnits(sentence);
  const raw = cjk / CJK_CHARS_PER_SECOND + words / ENGLISH_WORDS_PER_SECOND;
  const speed = resolveSpeechPace(pace);
  const divisor = speed === "slow" ? 0.8 : speed === "fast" ? 1.2 : 1;
  return Math.max(1, Math.round(raw / divisor));
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

// Spoken script the character will read — required, one sentence per clip.
export function talkingHeadSpokenError(script: string, pace?: SpeechPace) {
  const sentences = splitTalkingHeadSentences(script);
  if (sentences.length === 0) return "請輸入角色要讀的講稿。";
  return talkingHeadPlanError(script, pace);
}

// Stop when the spoken script cannot be one-sentence clips.
export function talkingHeadPlanError(source: string, pace?: SpeechPace) {
  const sentences = splitTalkingHeadSentences(source);
  if (sentences.length === 0) return "請輸入角色要讀的講稿。";
  if (sentences.length > TALKING_HEAD_MAX_CLIPS) {
    return `呢段稿有 ${sentences.length} 句，對鏡讀稿最多 ${TALKING_HEAD_MAX_CLIPS} 段。請刪走句子或改標點後再試。`;
  }
  for (const sentence of sentences) {
    const seconds = talkingHeadSeconds(sentence, pace);
    if (seconds > TALKING_HEAD_MAX_SECONDS) {
      return `「${sentence}」計出 ${seconds} 秒，超過 ${TALKING_HEAD_MAX_SECONDS} 秒。請把呢句改短，系統唔會自動拆開。`;
    }
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
}): TalkingHeadClipPlan[] {
  const sentences = splitTalkingHeadSentences(input.source);
  const total = sentences.length;
  const clips: TalkingHeadClipPlan[] = [];
  for (let index = 0; index < sentences.length; index += 1) {
    const line = sentences[index];
    const seconds = talkingHeadSeconds(line, input.pace);
    const endScene = shotLine(input.language, "end", line);
    const previousLine = index === 0 ? undefined : sentences[index - 1];
    const startScene =
      index === 0 ? shotLine(input.language, "start", line) : clips[index - 1].endScene;
    clips.push({
      clipNumber: index + 1,
      timeRange: `0–${seconds}s`,
      durationSeconds: seconds,
      narrativeJob: jobLine(input.language, index + 1, total),
      explainerScene: startScene,
      startScene,
      endScene,
      motionCamera: motionLine(input.language, seconds, line, previousLine),
      englishVo: line,
      bgmSfx: input.language === "en" ? "none" : "無",
    });
  }
  return clips;
}

export function talkingHeadDurationHint(pace?: SpeechPace) {
  return [
    "Talking-head read: ignore the duration preset.",
    "The first user text is a DIRECTOR INSTRUCTION for staging and tone. The second user text is the SPOKEN SCRIPT — copy each sentence into englishVo verbatim.",
    "ONE spoken sentence = ONE clip. Split only on newlines and sentence enders (。！？. ! ?). Never merge or rewrite a spoken sentence.",
    `Clip count = spoken sentence count, from 1 to ${TALKING_HEAD_MAX_CLIPS}.`,
    `durationSeconds = round(Chinese characters / ${CJK_CHARS_PER_SECOND} + English words / ${ENGLISH_WORDS_PER_SECOND}), then ${paceNote(pace)}. Minimum 1s. If any sentence would exceed ${TALKING_HEAD_MAX_SECONDS}s, stop — do not rewrite that line.`,
    "Same locked medium close-up for every clip. The character looks into the lens the whole time.",
    "Clip 2+ startScene must copy the previous clip's endScene. Motion is mouth and a small nod only. One bottom subtitle equal to that clip's spoken line, same on the start and end still.",
  ].join(" ");
}

export function talkingHeadDirectorBlock() {
  return [
    "This is a TALKING-HEAD READ. The on-screen character faces the camera and speaks. There is no cutaway and no second character.",
    "The director instruction is planning notes only (tone, emphasis, must-have looks). It is NOT spoken.",
    "The spoken script is locked. Each clip's englishVo is exactly one source sentence, copied verbatim. Do not paraphrase.",
    "Camera, set, and light stay identical across every clip. Clip 2 and after open on the previous clip's end still.",
    "Bottom subtitle only: the spoken sentence, nothing else written in the frame.",
  ].join(" ");
}

function paceNote(pace?: SpeechPace) {
  const speed = resolveSpeechPace(pace);
  if (speed === "slow") return "divide by 0.8 because the pace is slow";
  if (speed === "fast") return "divide by 1.2 because the pace is fast";
  return "keep that number because the pace is medium";
}

function jobLine(language: VoLanguage | undefined, index: number, total: number) {
  if (language === "en") return `sentence ${index} of ${total}`;
  return `第 ${index} 句，共 ${total} 句`;
}

function shotLine(language: VoLanguage | undefined, moment: "start" | "end", line: string) {
  if (language === "en") {
    const pose =
      moment === "start"
        ? "Character: centered, eyes into the lens, mouth just opening."
        : "Character: same pose, eyes into the lens, mouth just closed after the line.";
    return `${pose} Set: the same plain background in every clip, no new props. Light: soft and even, unchanged. Camera: locked medium close-up, character centered. Subtitle: one bottom line, exactly "${line}".`;
  }
  const pose =
    moment === "start"
      ? "角色：置中，望住鏡頭，準備開口。"
      : "角色：同一姿勢，望住鏡頭，呢句講完、口部合上。";
  return `${pose}場景：全程同一個簡潔背景，冇新道具。光：柔和均勻，不變。鏡頭：中近景、鎖定、角色置中。字幕：畫面底部一行，逐字係「${line}」。`;
}

function motionLine(
  language: VoLanguage | undefined,
  seconds: number,
  line: string,
  previousLine?: string,
) {
  if (language === "en") {
    const subtitle = previousLine
      ? `Bottom subtitle changes from "${previousLine}" to "${line}".`
      : `Bottom subtitle stays "${line}".`;
    return `0–${seconds}s the character looks into the lens and speaks this one sentence, mouth moving, one small nod; camera stays locked. ${subtitle}`;
  }
  const subtitle = previousLine
    ? `底部字幕由「${previousLine}」換成「${line}」。`
    : `底部字幕保持「${line}」。`;
  return `0–${seconds}s 望住鏡頭讀出呢句，口型跟住講，輕微點頭；鏡頭鎖定。${subtitle}`;
}
