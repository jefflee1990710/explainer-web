import type { PerformanceSlots } from "@/model/director-performance";
import type { FramePosition, SpeechPace, VoLanguage } from "@/model/project";
import { FRAME_COST, FRAMES_COST } from "@/service/credit-costs";
import { chainsClipStarts, inheritsPreviousEnd } from "@/service/director/clip-continuity";
import { DEFAULT_PERFORMANCE, performanceLanguage } from "@/service/director/performance";
import { resolveSpeechPace } from "@/service/director/speech-pace";
import { hasAnchorProp, speakOnlyThisClip, talkingMotionLine, type TalkingShot } from "@/service/director/talking-performance";
import { toWrittenChinese } from "@/service/director/written-chinese";
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

// 9:16 Instagram Reels sit the subtitle just under the middle. Landscape stays at the bottom.
function talkingHeadSubtitleBelowCenter(aspectRatio?: string) {
  return aspectRatio === "9:16";
}

export function planTalkingHeadClips(input: {
  source: string;
  pace?: SpeechPace;
  language?: VoLanguage;
  aspectRatio?: string;
  // From the director visual, e.g. "full-body". Omitted when the director names no shot.
  shot?: string;
  // Uploaded room photos replace the set sentence.
  background?: boolean;
  // Resolved performance slots in the prompt language. Defaults to the shot's built-in set.
  performance?: PerformanceSlots;
}): TalkingHeadClipPlan[] {
  const lines = balanceTalkingHeadLines(input.source, input.pace);
  const total = lines.length;
  const clips: TalkingHeadClipPlan[] = [];
  const talkingShot: TalkingShot = input.shot === "full-body" ? "full-body" : "face";
  const perf = input.performance ?? DEFAULT_PERFORMANCE[talkingShot][performanceLanguage(input.language)];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const seconds = plannedClipSeconds(line, input.pace);
    const belowCenter = talkingHeadSubtitleBelowCenter(input.aspectRatio);
    const scene = { shot: input.shot, belowCenter, background: input.background, perf };
    const endScene = shotLine(input.language, "end", line, scene);
    const previousLine = index === 0 ? undefined : lines[index - 1];
    // Pose continues from the previous end. The subtitle is this clip's own line.
    const startScene =
      index === 0
        ? shotLine(input.language, "start", line, scene)
        : withThisClipSubtitle(clips[index - 1].endScene, input.language, line, belowCenter);
    clips.push({
      clipNumber: index + 1,
      timeRange: `0–${seconds}s`,
      durationSeconds: seconds,
      narrativeJob: jobLine(input.language, index + 1, total),
      explainerScene: startScene,
      startScene,
      endScene,
      motionCamera: talkingMotionLine({
        language: input.language,
        seconds,
        line,
        previousLine,
        shot: talkingShot,
        clipNumber: index + 1,
        totalClips: total,
        belowCenter,
        performance: perf,
      }),
      englishVo: line,
      bgmSfx: input.language === "en" ? "none" : "無",
    });
  }
  return clips;
}

// Talking-head video prompts are planned in Phase A (motionCamera). Gemini structured
// Phase B often returns no object, so production reuses that row instead of calling the model.
// Phase A rows only guarantee clip number, duration, and motion. startScene may be absent.
export function talkingHeadPhaseBPrompt(input: {
  phaseA: {
    clips: Array<{ clipNumber: number; durationSeconds: number; motionCamera?: string; englishVo?: string }>;
  };
  clipNumber: number;
  language?: VoLanguage;
}) {
  const row = input.phaseA.clips.find((clip) => clip.clipNumber === input.clipNumber);
  const prompt = row?.motionCamera?.trim();
  if (!row || !prompt) return undefined;
  const index = input.phaseA.clips.findIndex((clip) => clip.clipNumber === input.clipNumber);
  const previous = index > 0 ? input.phaseA.clips[index - 1]?.englishVo : undefined;
  return {
    clipNumber: input.clipNumber,
    durationSeconds: row.durationSeconds,
    prompt: previous ? speakOnlyThisClip(prompt, row.englishVo || "", input.language) : prompt,
  };
}

export function talkingHeadDurationHint(pace?: SpeechPace, skillSlug?: string) {
  const fullBody = skillSlug === FULL_BODY_TALKING_HEAD_SKILL_SLUG;
  return [
    fullBody ? "Full-body talking-head read: ignore the duration preset." : "Talking-head read: ignore the duration preset.",
    "The first user text is a DIRECTOR INSTRUCTION for staging and tone. The second user text is the SPOKEN SCRIPT — copy the words into englishVo verbatim.",
    "Do not force one sentence per clip. Group short lines and split long lines so each clip has a similar word count and the same speaking pace. Never cut through a complete English word such as Instagram, Webinar, or Scro.io.",
    `Clip count is from 1 to ${TALKING_HEAD_MAX_CLIPS}. Each clip is ${PROVIDER_MIN_SECONDS}–${TALKING_HEAD_MAX_SECONDS}s.`,
    `durationSeconds follows Chinese characters / ${CJK_CHARS_PER_SECOND} + English words / ${ENGLISH_WORDS_PER_SECOND}, then ${paceNote(pace)}.`,
    fullBody
      ? "Locked full-body shot. Head, torso, and feet stay in frame. The character looks into the lens. Do not crop to a close-up."
      : "Locked seated medium shot, like a real phone video filmed at home. Head and torso stay in frame. The character sits and looks into the lens. Do not stand them up. Do not crop to a face-only close-up.",
    "Clip 2+ keeps the previous clip's pose, set, and camera, but both stills show this clip's own spoken line as the subtitle. Never copy the previous clip's words into this clip's subtitle or voice. Motion is continuous lip-sync like a real person filming a reel: eyes on the lens, head tilting and nodding, hands gesturing and changing shape every 1–2 seconds, following the performance slots in the director block. The voice says only this clip's line, once.",
  ].join(" ");
}

function talkingSubtitleRule(aspectRatio?: string) {
  if (talkingHeadSubtitleBelowCenter(aspectRatio)) {
    return "One subtitle a little below the vertical center of the frame, clear of the face and clear of the bottom edge. Spell that clip's spoken line. Nothing else written.";
  }
  if (aspectRatio === "16:9") {
    return "One subtitle across the bottom of the frame. Spell that clip's spoken line. Nothing else written.";
  }
  return "On a 9:16 Instagram Reel, one subtitle a little below the vertical center, clear of the face and the bottom edge. On a 16:9 landscape frame, one subtitle across the bottom. Spell that clip's spoken line. Nothing else written.";
}

// Phase A director block. Performance slots (English) describe the style layer the
// user may have customised; the pipeline rules around them are fixed.
export function talkingHeadDirectorBlock(skillSlug?: string, aspectRatio?: string, performance?: PerformanceSlots) {
  const fullBody = skillSlug === FULL_BODY_TALKING_HEAD_SKILL_SLUG;
  const p = performance ?? DEFAULT_PERFORMANCE[fullBody ? "full-body" : "face"].en;
  const anchored = hasAnchorProp(p);
  const hands = anchored
    ? `one hand keeping ${p.anchorProp} as a fixed anchor while the other hand does all the gesturing`
    : "both hands gesturing at chest height";
  return [
    fullBody
      ? "This is a FULL-BODY TALKING-HEAD READ. Exactly one character is on screen for the whole video: they face the camera, head to feet in frame, and speak. There is no cutaway, no crowd, and no second character."
      : `This is a TALKING-HEAD READ. Exactly one character is on screen for the whole video: they sit, face the camera${anchored ? `, hold ${p.anchorProp}` : ""}, and speak. There is no cutaway, no crowd, and no second character.`,
    "The director instruction is planning notes only (tone, emphasis, must-have looks). It is NOT spoken.",
    "The spoken script is locked. Each clip's englishVo is a verbatim slice of that script. Do not paraphrase. Give every clip a similar amount of speech.",
    fullBody
      ? `Camera is a locked full-body shot. Do not crop to a close-up or a medium shot. Set: ${p.set}. Light: ${p.light}. Set and light stay identical across every clip. Clip 2 and after open on the previous clip's end still.`
      : `Camera is a locked seated medium shot: head and torso${anchored ? " and the handheld prop" : ""} stay in frame. Set: ${p.set}. Light: ${p.light}. Same set and light in every clip. No pictures pasted on the frame. Do not stand the character up. Do not crop to a face-only close-up. Clip 2 and after open on the previous clip's end still.`,
    fullBody
      ? `On-camera speech like a real person recording a reel: eyes locked on the lens, continuous lip-sync, head tilting and nodding, ${hands}, weight shifting hip to hip. Never freeze the face, head, hands, or body. Never a greeting wave.`
      : `On-camera speech like a real person filming a phone video at home: seated, eyes locked on the lens, continuous lip-sync, head tilting and nodding, ${hands}. Natural skin, real cloth, unposed. Never freeze the face or neck. Never a greeting wave. Never stand up.`,
    `Face pattern: resting face is ${p.restingFace}. Emphasis: ${p.emphasisBeat}. Clip 1 opens with ${p.hookBeat} as the hook. The last clip ends on ${p.ctaBeat}.`,
    `Gesture pattern: the gesturing hand changes shape every 1–2 seconds in time with the words — ${p.gestureLibrary}. Head: ${p.headMotion}.`,
    talkingSubtitleRule(aspectRatio),
    "Each clip's voice says only that clip's own line, once. Never repeat the previous clip's sentence, even when the opening frame still shows it.",
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

type SceneInput = { shot?: string; belowCenter?: boolean; background?: boolean; perf: PerformanceSlots };

// Start still: hook face, free hand mid-gesture. End still: smile relaxed, head tilted the other way.
function shotLine(language: VoLanguage | undefined, moment: "start" | "end", line: string, scene: SceneInput) {
  const painted = language === "yue" ? toWrittenChinese(line) : line;
  const camera = cameraClause(language, scene.shot, scene.perf);
  const fullBody = scene.shot === "full-body";
  const anchored = hasAnchorProp(scene.perf);
  const p = scene.perf;
  if (language === "en") {
    const prop = anchored ? ` One hand holds ${p.anchorProp}.` : "";
    const propEnd = anchored ? ` ${capitalize(p.anchorProp)} stays in that hand, a little lower.` : "";
    const freeHand = anchored ? "The other hand" : "One hand";
    const pose =
      moment === "start"
        ? fullBody
          ? `Character: the only person in the frame, centered, eyes locked into the lens as if talking into a phone, mouth just opening, ${p.hookBeat}, head tilted a few degrees, a live thinking expression.${prop} ${freeHand} is already up at chest height with the index finger raised mid-gesture.`
          : `Character: the only person in the frame, seated and centered, head and torso in frame, eyes locked into the lens like a real phone video filmed at home, mouth just opening, ${p.hookBeat}, head tilted a few degrees, a live unposed expression.${prop} ${freeHand} is already up at chest height, index finger raised mid-gesture.`
        : fullBody
          ? `Character: still the only person in the frame, eyes still locked on the lens, mouth just closed after the line, an engaged small smile, eyebrows relaxed, head tilted the other way.${propEnd} ${freeHand} is still slightly raised at chest height with an open palm, weight on the other hip, feet in frame.`
          : `Character: still the only person in the frame, still seated, eyes still locked on the lens, mouth just closed into a small real smile, eyebrows relaxed, head tilted the other way.${propEnd} ${freeHand} is open-palm at chest height, caught between gestures.`;
    const place = scene.belowCenter
      ? "one line a little below the vertical center, clear of the face and the bottom edge"
      : "one bottom line";
    return `${pose} ${setClause("en", scene)}${camera} Subtitle: ${place}, exactly "${painted}".`;
  }
  const prop = anchored ? `一隻手拎住${p.anchorProp}。` : "";
  const propEnd = anchored ? `${p.anchorProp}仲喺嗰隻手，稍為放低。` : "";
  const freeHand = anchored ? "另一隻手" : "一隻手";
  const pose =
    moment === "start"
      ? fullBody
        ? `角色：畫面只有呢一個人，置中，直望鏡頭好似對住手機講，準備開口，${p.hookBeat}，頭微傾，神情有生氣。${prop}${freeHand}已經提到胸前豎起食指做緊手勢。`
        : `角色：畫面只有呢一個人，坐住置中，頭同上身喺畫面，直望鏡頭好似喺屋企用手機實拍，準備開口，${p.hookBeat}，頭微傾，神情自然唔擺拍。${prop}${freeHand}已經提到胸前，豎起食指做緊手勢。`
      : fullBody
        ? `角色：畫面仍然只有呢一個人，仍然直望鏡頭，呢句講完、口部合上變成有神嘅淺笑，眉毛放鬆，頭反向微傾。${propEnd}${freeHand}仲喺胸前掌心打開，重心換咗邊，腳留喺畫面。`
        : `角色：畫面仍然只有呢一個人，仍然坐住直望鏡頭，呢句講完、口部合上變成自然淺笑，眉毛放鬆，頭反向微傾。${propEnd}${freeHand}掌心打開停喺胸前，好似兩個手勢之間。`;
  const place = scene.belowCenter ? "畫面垂直中線下面少少一行，避開臉同最底邊" : "畫面底部一行";
  return `${pose}${setClause("yue", scene)}${camera}字幕：${place}，逐字係「${painted}」。`;
}

// Keep the previous end's pose, and swap in this clip's own subtitle.
function withThisClipSubtitle(
  previousEnd: string,
  language: VoLanguage | undefined,
  line: string,
  belowCenter: boolean,
) {
  const painted = language === "yue" ? toWrittenChinese(line) : line;
  const body = previousEnd.replace(/\s*(?:Subtitle:|字幕：).*$/u, "").trim();
  if (language === "en") {
    const place = belowCenter
      ? "one line a little below the vertical center, clear of the face and the bottom edge"
      : "one bottom line";
    return `${body} Subtitle: ${place}, exactly "${painted}".`;
  }
  const place = belowCenter ? "畫面垂直中線下面少少一行，避開臉同最底邊" : "畫面底部一行";
  return `${body}字幕：${place}，逐字係「${painted}」。`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Set and light come from the slots. An uploaded room photo replaces the set sentence.
function setClause(language: "en" | "yue", scene: SceneInput) {
  const p = scene.perf;
  const anchored = hasAnchorProp(p);
  const noProps = language === "en"
    ? anchored ? `no new props besides ${p.anchorProp}` : "no new props"
    : anchored ? `除咗${p.anchorProp}之外冇新道具` : "冇新道具";
  // A bed in this line was getting later clips blocked, so the photo rule names it.
  if (scene.background) {
    return language === "en"
      ? `Set: the background is the attached scene reference photo. Do not draw a bookshelf, a bed, or a different room. The same background stays in every clip. No pictures pasted on the frame, no extra writing, ${noProps}. Light follows the reference photo.`
      : `場景：背景用附上的場景參考圖，唔好再畫書架、床或者其他房間。全程同一個背景。畫面上面唔好貼圖、唔好加字，${noProps}。光跟參考圖。`;
  }
  return language === "en"
    ? `Set: ${p.set}. No pictures pasted on the frame, no extra writing, ${noProps}. Light: ${p.light}.`
    : `場景：${p.set}。畫面上面唔好貼圖、唔好加字，${noProps}。光：${p.light}。`;
}

function cameraClause(language: VoLanguage | undefined, shot: string | undefined, perf: PerformanceSlots) {
  const size = shot?.trim() || "";
  const fullBody = size === "full-body";
  const anchored = hasAnchorProp(perf);
  if (language === "en") {
    if (fullBody) return " Camera: locked full-body, character centered, head to feet in frame.";
    const inFrame = anchored ? "Head, torso, and the handheld prop stay in frame." : "Head and torso stay in frame.";
    if (!size) {
      return ` Camera: locked seated medium shot. ${inFrame} Do not stand up. Do not crop to a face-only close-up.`;
    }
    return ` Camera: locked ${size}, character seated and centered${anchored ? ", handheld prop in frame" : ""}.`;
  }
  if (fullBody) return "鏡頭：鎖定全身，角色置中，頭到腳都在畫面內。";
  const inFrame = anchored ? "頭、上身同手持道具留喺畫面" : "頭同上身留喺畫面";
  if (!size) {
    return `鏡頭：鎖定坐姿中景，${inFrame}。唔好企起身，唔好裁成淨係塊臉。`;
  }
  return `鏡頭：鎖定${shotLabel(size)}，角色坐住置中${anchored ? "，手持道具留喺畫面" : ""}。`;
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

// A Latin token (Instagram, Webinar, Scro.io, DM) is one atom. Han is one character.
// A no-space Cantonese line must not be sliced through the middle of an English word.
function speechAtoms(text: string): string[] {
  const atoms: string[] = [];
  const token = /\s+|[A-Za-z][A-Za-z0-9]*(?:[.'’-][A-Za-z0-9]+)*|\p{Script=Han}|./gu;
  for (const match of text.matchAll(token)) {
    const piece = match[0];
    if (/^\s+$/.test(piece)) {
      if (atoms.length && /[A-Za-z0-9]$/.test(atoms[atoms.length - 1])) {
        atoms[atoms.length - 1] += " ";
      }
      continue;
    }
    atoms.push(piece);
  }
  return atoms;
}

function splitLongPiece(text: string, pace?: SpeechPace) {
  const trimmed = text.trim();
  if (rawSpokenSeconds(trimmed, pace) <= 4) return [trimmed];
  const atoms = speechAtoms(trimmed);
  if (atoms.length <= 1) return [trimmed];
  const parts = Math.max(2, Math.ceil(rawSpokenSeconds(trimmed, pace) / 4));
  const weights = atoms.map((atom) => Math.max(rawSpokenSeconds(atom.trim(), pace), 0.01));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const target = total / parts;
  const chunks: string[] = [];
  let current: string[] = [];
  let weight = 0;
  for (let index = 0; index < atoms.length; index += 1) {
    current.push(atoms[index]);
    weight += weights[index];
    const remaining = atoms.length - index - 1;
    const slotsLeft = parts - chunks.length - 1;
    if (slotsLeft > 0 && weight >= target && remaining >= slotsLeft) {
      chunks.push(current.join("").trim());
      current = [];
      weight = 0;
    }
  }
  if (current.length) chunks.push(current.join("").trim());
  return chunks.filter(Boolean);
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
