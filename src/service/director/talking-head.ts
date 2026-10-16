import type { PerformanceSlots } from "@/model/director-performance";
import type { FramePosition, SpeechPace, VoLanguage } from "@/model/project";
import { FRAME_COST, FRAMES_COST } from "@/service/credit-costs";
import { chainsClipStarts, inheritsPreviousEnd } from "@/service/director/clip-continuity";
import { DEFAULT_PERFORMANCE, performanceLanguage } from "@/service/director/performance";
import { resolveSpeechPace } from "@/service/director/speech-pace";
import { hasAnchorProp, speakOnlyThisClip, talkingMotionLine, type TalkingShot } from "@/service/director/talking-performance";
import { talkingRealismMotion, talkingRealismStill } from "@/service/director/talking-realism";
import { toWrittenChinese } from "@/service/director/written-chinese";
import { mediaSrc } from "@/util/media-src";

export const TALKING_HEAD_SKILL_SLUG = "talking-head-director";
export const FULL_BODY_TALKING_HEAD_SKILL_SLUG = "full-body-talking-head-director";
export const TALKING_HEAD_MAX_CLIPS = 20;
export const TALKING_HEAD_MAX_SECONDS = 12;
// One short line per clip so the on-screen subtitle stays large.
// Speech can be under the 5s render floor; the clip still lasts at least 5s.
const SPEECH_TARGET_SECONDS = 4;
const SPEECH_MAX_SECONDS = 5;

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

// A copied start is free. Clip 1 still draws both stills. Later chained starts copy the previous end.
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
  // User's own photo. Clip 1's start matches it; later clips keep that person.
  openingPhoto?: boolean;
  // Resolved performance slots in the prompt language. Defaults to the shot's built-in set.
  performance?: PerformanceSlots;
  // True when a later pass burns the subtitle on. Stills and motion stay free of painted letters.
  overlay?: boolean;
  // Brief chose None. Stills and the video stay free of every written word.
  noText?: boolean;
  // Cinematic realistic style: add light source, skin detail, and foreground depth.
  realistic?: boolean;
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
    const scene = {
      shot: input.shot,
      belowCenter,
      background: input.background,
      openingPhoto: input.openingPhoto,
      perf,
      overlay: input.overlay || input.noText,
      realistic: input.realistic,
      clipIndex: index,
    };
    const realism = { fullBody: talkingShot === "full-body", openingPhoto: input.openingPhoto };
    const endScene = shotLine(input.language, "end", line, scene);
    const previousLine = index === 0 ? undefined : lines[index - 1];
    const nextLine = index + 1 < lines.length ? lines[index + 1] : undefined;
    // Pose continues from the previous end. The subtitle is this clip's own line.
    const startScene =
      index === 0
        ? shotLine(input.language, "start", line, scene)
        : withThisClipSubtitle(
            clips[index - 1].endScene,
            input.language,
            line,
            belowCenter,
            input.overlay || input.noText,
          );
    clips.push({
      clipNumber: index + 1,
      timeRange: `0–${seconds}s`,
      durationSeconds: seconds,
      narrativeJob: jobLine(input.language, index + 1, total),
      explainerScene: startScene,
      startScene,
      endScene,
      motionCamera: withMotionRealism(
        talkingMotionLine({
          language: input.language,
          seconds,
          line,
          previousLine,
          shot: talkingShot,
          clipNumber: index + 1,
          totalClips: total,
          belowCenter,
          performance: perf,
          overlay: input.overlay,
          noText: input.noText,
          nextLine,
        }),
        input.realistic ? talkingRealismMotion(input.language, realism) : "",
      ),
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
  // Talking-head read burns the next line onto the end still.
  subtitleHandoff?: boolean;
}) {
  const row = input.phaseA.clips.find((clip) => clip.clipNumber === input.clipNumber);
  const prompt = row?.motionCamera?.trim();
  if (!row || !prompt) return undefined;
  const index = input.phaseA.clips.findIndex((clip) => clip.clipNumber === input.clipNumber);
  const previous = index > 0 ? input.phaseA.clips[index - 1]?.englishVo : undefined;
  const spoken = previous ? speakOnlyThisClip(prompt, row.englishVo || "", input.language) : prompt;
  const next = input.phaseA.clips[index + 1]?.englishVo;
  return {
    clipNumber: input.clipNumber,
    durationSeconds: row.durationSeconds,
    prompt: input.subtitleHandoff
      ? withSubtitleHandoff(spoken, row.englishVo || "", next, input.language)
      : spoken,
  };
}

// Older motion text has no handoff. Add it once so a re-render still moves the subtitle.
function withSubtitleHandoff(prompt: string, line: string, nextLine: string | undefined, language?: VoLanguage) {
  if (/slides and fades into the next subtitle|滑動淡入下一段字幕|on-screen subtitle holds|畫面字幕一直係/.test(prompt)) {
    return prompt;
  }
  const next = nextLine?.trim();
  if (language === "yue") {
    const painted = toWrittenChinese(line);
    const sentence = next
      ? `。畫面字幕由「${painted}」喺最後一刻滑動淡入下一段字幕「${toWrittenChinese(next)}」，最後一幀只係下一段嗰句。把聲只講「${line}」一次，唔好講下一段字幕`
      : `。畫面字幕一直係「${painted}」，去到最後一幀都係`;
    return `${prompt}${sentence}`;
  }
  const sentence = next
    ? `, and the on-screen subtitle starts as "${line}" and in the last moment slides and fades into the next subtitle "${next}", so the last frame shows only that next line. The voice says "${line}" once and does not speak the next subtitle`
    : `, and the on-screen subtitle holds "${line}" through the last frame`;
  return `${prompt}${sentence}`;
}

export function talkingHeadDurationHint(pace?: SpeechPace, skillSlug?: string) {
  const fullBody = skillSlug === FULL_BODY_TALKING_HEAD_SKILL_SLUG;
  return [
    fullBody ? "Full-body talking-head read: ignore the duration preset." : "Talking-head read: ignore the duration preset.",
    "The first user text is a DIRECTOR INSTRUCTION for staging and tone. The second user text is the SPOKEN SCRIPT — copy the words into englishVo verbatim.",
    "Split the script into short lines. Each clip is about one short clause, not a paragraph, so the subtitle stays large. Group only when a line is already shorter than that. Never cut through a complete English word such as Instagram, Webinar, or Scro.io.",
    `Clip count is from 1 to ${TALKING_HEAD_MAX_CLIPS}. Each clip's speech is about ${SPEECH_TARGET_SECONDS}s and at most ${SPEECH_MAX_SECONDS}s unless the script cannot fit in ${TALKING_HEAD_MAX_CLIPS} clips. The rendered clip is still ${PROVIDER_MIN_SECONDS}–${TALKING_HEAD_MAX_SECONDS}s so a short line is not sped up.`,
    `durationSeconds follows Chinese characters / ${CJK_CHARS_PER_SECOND} + English words / ${ENGLISH_WORDS_PER_SECOND}, then ${paceNote(pace)}.`,
    fullBody
      ? "Locked full-body shot. Head, torso, and feet stay in frame. The character looks into the lens. Do not crop to a close-up."
      : "The phone is fixed on a phone tripod. The lens is 24mm at f/1.8: face sharp, background a little soft. Head and torso stay in frame. Both hands stay inside the frame. No microphone. The character sits and looks into the lens. Do not stand them up. Do not shoot at arm's length. Do not send an arm out of the frame. Do not crop to a face-only close-up.",
    "Clip 2+ keeps the previous clip's pose, set, and camera, but both stills show this clip's own spoken line as the subtitle. Never copy the previous clip's words into this clip's subtitle or voice. The camera does not jump: the end still is the same crop, distance, and screen position as the start still. Only the mouth, a few degrees of head, and the hands change. Motion is continuous lip-sync: eyes on the lens, head tilting and nodding, both hands gesturing. The voice says only this clip's line, once.",
  ].join(" ");
}

function talkingSubtitleRule(aspectRatio?: string) {
  const place = talkingHeadSubtitleBelowCenter(aspectRatio)
    ? "a little below the vertical center of the frame, clear of the face and clear of the bottom edge"
    : aspectRatio === "16:9"
      ? "across the bottom of the frame"
      : "a little below the vertical center on a 9:16 Instagram Reel, and across the bottom on a 16:9 landscape frame";
  return `Write the subtitle into startScene and endScene as one LARGE phone-readable subtitle, ${place}. Spell the spoken line exactly. It fades and slides in at the start of the clip and fades and slides out at the end. The camera stays on the same framing from the start still to the end still. Nothing else written.`;
}

// Phase A director block. Performance slots (English) describe the style layer the
// user may have customised; the pipeline rules around them are fixed.
export function talkingHeadDirectorBlock(
  skillSlug?: string,
  aspectRatio?: string,
  performance?: PerformanceSlots,
  overlay?: boolean,
  noText?: boolean,
  realistic?: boolean,
) {
  const fullBody = skillSlug === FULL_BODY_TALKING_HEAD_SKILL_SLUG;
  const p = performance ?? DEFAULT_PERFORMANCE[fullBody ? "full-body" : "face"].en;
  const anchored = hasAnchorProp(p);
  const hands = anchored
    ? `one hand keeping ${p.anchorProp} as a fixed anchor while the other hand does all the gesturing`
    : "both hands gesturing at chest height";
  return [
    fullBody
      ? "This is a FULL-BODY TALKING-HEAD READ. Exactly one character is on screen for the whole video: they face the camera, head to feet in frame, and speak. There is no cutaway, no crowd, and no second character."
      : `This is a TALKING-HEAD READ. Exactly one character is on screen for the whole video: they sit in front of a phone on a tripod, face the camera${anchored ? `, and hold ${p.anchorProp}` : ""}, and speak. There is no cutaway, no crowd, and no second character. No microphone.`,
    "The director instruction is planning notes only (tone, emphasis, must-have looks). It is NOT spoken.",
    "The spoken script is locked. Each clip's englishVo is a verbatim slice of that script. Do not paraphrase. Give every clip a similar amount of speech.",
    fullBody
      ? `Camera is a locked full-body shot. Do not crop to a close-up or a medium shot. Set: ${p.set}. Light: ${p.light}. Set and light stay identical across every clip. Clip 2 and after open on the previous clip's end still.`
      : `Camera is a phone fixed on a phone tripod. The lens is 24mm at f/1.8, the face sharp and the background a little soft. Head and torso${anchored ? " and the handheld prop" : ""} stay in frame. Both hands stay inside the frame. Set: ${p.set}. Light: ${p.light}. Same set and light in every clip. No pictures pasted on the frame. No microphone. Do not stand the character up. Do not shoot at arm's length. Do not send an arm out of the frame. Do not crop to a face-only close-up. Clip 2 and after open on the previous clip's end still.`,
    fullBody
      ? `On-camera speech like a real person recording a reel: eyes locked on the lens, continuous lip-sync, head tilting and nodding, ${hands}, weight shifting hip to hip. Never freeze the face, head, hands, or body. Never a greeting wave.`
      : `On-camera speech to a phone on a tripod: seated, eyes locked on the lens, continuous lip-sync, head tilting and nodding, ${hands}. Natural skin, real cloth, unposed. Never freeze the face or neck. Never a greeting wave. Never stand up.`,
    `Face pattern: resting face is ${p.restingFace}. Emphasis: ${p.emphasisBeat}. Clip 1 opens with ${p.hookBeat} as the hook. The last clip ends on ${p.ctaBeat}.`,
    `Gesture pattern: the gesturing hand changes shape every 1–2 seconds in time with the words — ${p.gestureLibrary}. Head: ${p.headMotion}. Alternate the ending head tilt and active gesturing hand across clips so two clips in a row never settle in the exact same head angle or hand pose.`,
    ...(realistic
      ? ["Realism (Cinematic realistic): every still names one motivated light source from the side with a soft rim light on the hair, real skin pores and fine facial hair, and a soft out-of-focus foreground element at one frame edge that never covers the face, hands, or subtitle. Never flat front light or plastic skin."]
      : []),
    noText
      ? "The frame has no letters, no subtitle, no caption, no logo, and no writing. The spoken line is voice only."
      : overlay
        ? fullBody
          ? "The frame has no letters, no subtitle, no caption, no logo, and no writing. The spoken line is voice only."
          : "The stills have no letters, no subtitle, no caption, no logo, and no writing. The video shows this clip's subtitle on the opening frame and the next clip's subtitle on the end frame, with a short slide-and-fade between them. The last clip keeps its own subtitle on the end frame. The voice says only this clip's line and never speaks the next subtitle."
        : talkingSubtitleRule(aspectRatio),
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

type SceneInput = {
  shot?: string;
  belowCenter?: boolean;
  background?: boolean;
  openingPhoto?: boolean;
  perf: PerformanceSlots;
  overlay?: boolean;
  realistic?: boolean;
  clipIndex?: number;
};

// Realism goes after camera and before the subtitle, so the subtitle swap keeps it.
function withStillRealism(still: string, language: VoLanguage | undefined, scene: SceneInput) {
  if (!scene.realistic) return still;
  const clause = talkingRealismStill(language, {
    fullBody: scene.shot === "full-body",
    openingPhoto: scene.openingPhoto,
  });
  return language === "en" ? `${still.trim()} ${clause}` : `${still.trim()}${clause}`;
}

function withMotionRealism(motion: string, clause: string) {
  if (!clause) return motion;
  const text = motion.trim();
  return `${text}${/[.。]$/.test(text) ? "" : "."} ${clause}`;
}

function endPoseVariationEn(clipIndex: number, fullBody: boolean, anchored: boolean, freeHand: string) {
  const variant = clipIndex % 6;
  if (anchored) {
    const headMoves = [
      "eyes on the lens, mouth just closed into a small real smile, eyebrows relaxed, head tilted noticeably to the left and torso leaning slightly forward",
      "head turned about 15 degrees to the right with eyes glancing off-camera to the side in a thoughtful pause, mouth in a soft half-smile, seated weight shifted slightly right",
      "eyes on the lens, mouth just closed into an engaged warm smile, torso settled back into the cushion with head tilted to the right",
      "torso angled slightly three-quarter, chin lifted, eyes glancing briefly down toward the gesturing hand with a lively knowing smile",
      "eyes locked on the lens, mouth just closed into a confident smile, eyebrows softly lifted, seated weight shifted slightly left with head upright",
      "eyes locked on the lens, mouth just closed into a warm conversational smile, leaning in closer toward the camera with head tilted slightly left",
    ];
    const handMoves = [
      `${freeHand} is open-palm at chest height, caught between gestures`,
      `${freeHand} is raised near the chin in a thoughtful gesture`,
      `${freeHand} is at chest height with fingers spread in a relaxed shrug`,
      `${freeHand} is at chest height with the index finger lightly raised on the key point`,
      `${freeHand} holds up two fingers at chest height in a counting gesture`,
      `${freeHand} rests lightly near mid-chest with a relaxed open hand`,
    ];
    return { head: headMoves[variant], hand: handMoves[variant] };
  }
  const headMoves = [
    "eyes locked on the lens, mouth just closed into a small real smile, eyebrows relaxed, head tilted noticeably to the left while leaning slightly forward",
    "head turned about 15 degrees to the right with eyes glancing off-camera to the upper-right in a natural thinking pause, mouth in a thoughtful half-smile, seated weight shifted slightly to the right side of the sofa",
    "eyes locked on the lens, mouth just closed into an engaged warm smile, torso leaning back into the sofa cushion with shoulders relaxed and head tilted to the right",
    "torso turned into a slight three-quarter angle, head tilted slightly down and left with eyes glancing briefly at her gesturing hands, a lively half-smile on the lips",
    "eyes locked on the lens, mouth just closed into a confident smile, eyebrows softly lifted, seated position shifted slightly to the left side of the cushion with chin lifted",
    "eyes locked on the lens, mouth just closed into a warm knowing smile, leaning noticeably forward toward the camera as if sharing a secret, head upright",
  ];
  const handMoves = fullBody
    ? [
        "One hand is slightly raised at chest height with an open palm while the other arm relaxes at the side, weight on the other hip",
        "The left hand is raised near chin height in a thinking gesture while the right hand rests low, weight shifted to the right hip",
        "Both hands are open wide at chest height in a relaxed two-handed shrug, posture relaxed",
        "One hand gestures outward at chest height with fingers spread while the other hand rests near the waist, torso angled three-quarter",
        "The right hand holds up two fingers at chest height while the left arm relaxes at the side, weight on the left hip",
        "One hand touches mid-chest lightly while the other hand offers an open palm toward the lens",
      ]
    : [
        "One hand is open-palm at chest height on one side while the other hand rests on the lap, caught between gestures",
        "One hand is raised near the chin in a thoughtful gesture while the other hand rests on the lap",
        "Both hands are open wide at chest height in a relaxed two-handed shrug while leaning back against the sofa",
        "One hand gestures at chest height with fingers spread while the other hand rests near the lap, torso angled slightly",
        "One hand holds up two fingers at chest height in a counting gesture while the other hand rests on the lap",
        "One hand touches mid-chest lightly while the other hand is open-palm toward the lens",
      ];
  return { head: headMoves[variant], hand: handMoves[variant] };
}

function endPoseVariationYue(clipIndex: number, fullBody: boolean, anchored: boolean, freeHand: string) {
  const variant = clipIndex % 6;
  if (anchored) {
    const headMoves = [
      "直望鏡頭，呢句講完、口部合上變成自然淺笑，眉毛放鬆，上身微微前傾、頭明顯向左邊傾幾度",
      "頭向右轉約 15 度、眼神自然望向畫面側邊思考緊，口部合上帶住淺笑，坐姿微移去右邊",
      "直望鏡頭，呢句講完、口部合上變成有神嘅淺笑，上身放鬆靠返後、頭向右邊傾幾度",
      "上身微側成三七面，頭微低望一望隻手、帶住親切笑容",
      "直望鏡頭，呢句講完、口部合上帶住自信微笑，坐姿微移去左邊、下巴微抬",
      "直望鏡頭，呢句講完、口部合上變成溫柔淺笑，上身向前傾近鏡頭",
    ];
    const handMoves = [
      `${freeHand}掌心打開停喺胸前，好似兩個手勢之間`,
      `${freeHand}輕輕舉到下巴旁邊做思考手勢`,
      `${freeHand}喺胸前五指微張做緊攤手聳肩手勢`,
      `${freeHand}喺胸前輕輕豎起食指點出重點`,
      `${freeHand}喺胸前豎起兩隻手指數數`,
      `${freeHand}自然放鬆貼近心口位置`,
    ];
    return { head: headMoves[variant], hand: handMoves[variant] };
  }
  const headMoves = [
    "直望鏡頭，呢句講完、口部合上變成自然淺笑，眉毛放鬆，上身微微前傾、頭明顯向左邊傾幾度",
    "頭向右轉約 15 度、眼神自然望向右上側邊思考緊，口部合上帶住思考淺笑，坐姿重心微移去沙發右邊",
    "直望鏡頭，呢句講完、口部合上變成有神嘅淺笑，上身放鬆靠返後沙發背、頭向右邊傾斜",
    "上身微轉成三七面角度，頭微低望一望比畫緊嘅雙手，嘴角帶住親切笑容",
    "直望鏡頭，呢句講完、口部合上帶住自信微笑，坐姿重心微移去沙發左邊、下巴微抬",
    "直望鏡頭，呢句講完、口部合上變成溫柔淺笑，上身明顯向前傾靠近鏡頭好似講緊秘密",
  ];
  const handMoves = fullBody
    ? [
        "一隻手仲喺胸前掌心打開，另一隻手自然垂低，重心輕輕換去另一邊，腳留喺同一個位置",
        "一隻手舉到下巴旁邊做思考手勢，另一隻手放低，重心換去右邊，腳留喺同一個位置",
        "兩隻手喺胸前自然攤開聳肩，身形放鬆，腳留喺同一個位置",
        "一隻手喺胸前向外輕推做手勢，另一隻手放喺腰旁，上身微側，腳留喺同一個位置",
        "一隻手喺胸前豎起兩隻手指數數，另一隻手自然垂低，腳留喺同一個位置",
        "一隻手輕撫心口，另一隻手掌心向鏡頭遞出，腳留喺同一個位置",
      ]
    : [
        "一隻手掌心打開停喺胸前，另一隻手放喺大髀，好似兩個手勢之間",
        "一隻手輕輕舉到下巴旁邊做思考手勢，另一隻手放喺大髀",
        "兩隻手喺胸前自然攤開聳肩，上身放鬆靠喺沙發背",
        "一隻手喺胸前微張手指做手勢，另一隻手放喺大髀，上身微側",
        "一隻手喺胸前豎起兩隻手指數數，另一隻手自然放喺大髀",
        "一隻手輕撫心口，另一隻手掌心向鏡頭打開",
      ];
  return { head: headMoves[variant], hand: handMoves[variant] };
}

// Start still: hook face, free hand mid-gesture. End still: smile relaxed, head tilted the other way.
function shotLine(language: VoLanguage | undefined, moment: "start" | "end", line: string, scene: SceneInput) {
  const camera = cameraClause(language, scene.shot, scene.perf);
  const fullBody = scene.shot === "full-body";
  const anchored = hasAnchorProp(scene.perf);
  const p = scene.perf;
  const clipIndex = scene.clipIndex ?? 0;
  if (scene.openingPhoto && moment === "start") {
    const pose =
      language === "en"
        ? "Character: the only person in the frame. Match the attached opening photo exactly: same face, hair, clothes, body, and pose. They look into the lens, mouth just opening."
        : "角色：畫面只有呢一個人。跟附上的開場照片：同一張臉、頭髮、衫、身形同姿勢。直望鏡頭，準備開口。";
    const still = withStillRealism(
      language === "en"
        ? `${pose} ${setClause("en", scene)}${camera}`
        : `${pose}${setClause("yue", scene)}${camera}`,
      language,
      scene,
    );
    if (scene.overlay) return still.trim();
    const painted = language === "yue" ? toWrittenChinese(line) : line;
    return language === "en"
      ? `${still} ${subtitleSentence("en", painted, scene.belowCenter)}`
      : `${still}${subtitleSentence("yue", painted, scene.belowCenter)}`;
  }
  if (language === "en") {
    const prop = anchored ? ` One hand holds ${p.anchorProp}.` : "";
    const propEnd = anchored ? ` The same hand still holds ${p.anchorProp}.` : "";
    const freeHand = anchored ? "The other hand" : "One hand";
    const sameFrame = " Same camera as the opening still: same crop, same distance, the character in the same place on screen. No zoom, no reframe, no jump.";
    const endVar = endPoseVariationEn(clipIndex, fullBody, anchored, freeHand);
    const pose =
      moment === "start"
        ? fullBody
          ? `Character: the only person in the frame, centered, eyes locked into the lens as if talking into a phone, mouth just opening, ${p.hookBeat}, head tilted a few degrees, a live thinking expression.${prop} ${freeHand} is already up at chest height with the index finger raised mid-gesture.`
          : `Character: the only person in the frame, seated and centered, head and torso in frame, eyes locked into the lens, mouth just opening, ${p.hookBeat}, head tilted a few degrees, a live unposed expression.${prop} ${freeHand} is already up at chest height, index finger raised mid-gesture.`
        : fullBody
          ? `Character: still the only person in the frame, ${endVar.head}.${propEnd} ${anchored ? `${endVar.hand}, weight on the other hip` : endVar.hand}, feet in the same place.${sameFrame}`
          : `Character: still the only person in the frame, still seated, ${endVar.head}.${propEnd} ${endVar.hand}.${sameFrame}`;
    const still = withStillRealism(`${pose} ${setClause("en", scene)}${camera}`, language, scene);
    // Overlay subtitles are composited later, so the still is pose, set, and camera only.
    if (scene.overlay) return still.trim();
    return `${still} ${subtitleSentence("en", line, scene.belowCenter)}`;
  }
  const prop = anchored ? `一隻手拎住${p.anchorProp}。` : "";
  const propEnd = anchored ? `同一隻手仍然拎住${p.anchorProp}。` : "";
  const freeHand = anchored ? "另一隻手" : "一隻手";
  const sameFrame = "鏡頭同開頭畫面一樣：同一個裁切、同一距離、角色留喺畫面同一個位置。唔好變焦，唔好跳鏡。";
  const endVarYue = endPoseVariationYue(clipIndex, fullBody, anchored, freeHand);
  const pose =
    moment === "start"
      ? fullBody
        ? `角色：畫面只有呢一個人，置中，直望鏡頭好似對住手機講，準備開口，${p.hookBeat}，頭微傾，神情有生氣。${prop}${freeHand}已經提到胸前豎起食指做緊手勢。`
        : `角色：畫面只有呢一個人，坐住置中，頭同上身喺畫面，直望鏡頭好似喺屋企用手機實拍，準備開口，${p.hookBeat}，頭微傾，神情自然唔擺拍。${prop}${freeHand}已經提到胸前，豎起食指做緊手勢。`
      : fullBody
        ? `角色：畫面仍然只有呢一個人，${endVarYue.head}。${propEnd}${anchored ? `${endVarYue.hand}，重心輕輕換咗少少，腳留喺同一個位置` : endVarYue.hand}。${sameFrame}`
        : `角色：畫面仍然只有呢一個人，仍然坐住，${endVarYue.head}。${propEnd}${endVarYue.hand}。${sameFrame}`;
  const still = withStillRealism(`${pose}${setClause("yue", scene)}${camera}`, language, scene);
  if (scene.overlay) return still.trim();
  return `${still}${subtitleSentence("yue", toWrittenChinese(line), scene.belowCenter)}`;
}

// Keep the previous end's pose, and swap in this clip's own subtitle.
function withThisClipSubtitle(
  previousEnd: string,
  language: VoLanguage | undefined,
  line: string,
  belowCenter: boolean,
  overlay?: boolean,
) {
  if (overlay) return previousEnd.replace(/\s*(?:Subtitle:|字幕：).*$/u, "").trim();
  const painted = language === "yue" ? toWrittenChinese(line) : line;
  const body = previousEnd.replace(/\s*(?:Subtitle:|字幕：).*$/u, "").trim();
  const lang = language === "en" ? "en" : "yue";
  return `${body} ${subtitleSentence(lang, painted, belowCenter)}`.replace(/\s{2,}/g, " ");
}

// Large lettering. A long line was being painted as one tiny row.
function subtitleSentence(language: "en" | "yue", line: string, belowCenter?: boolean) {
  if (language === "en") {
    const place = belowCenter
      ? "a little below the vertical center, clear of the face and the bottom edge"
      : "one LARGE bottom line, clear of the bottom edge";
    return `Subtitle: one LARGE phone-readable subtitle, ${place}, exactly "${line}".`;
  }
  const place = belowCenter ? "畫面垂直中線下面少少，避開臉同最底邊" : "畫面底部一行，避開最底邊";
  return `字幕：一個大字幕，手機上睇得清楚，${place}，逐字係「${line}」。`;
}

// Set and light come from the slots. An uploaded room photo replaces the set sentence.
function setClause(language: "en" | "yue", scene: SceneInput) {
  const p = scene.perf;
  const anchored = hasAnchorProp(p);
  const noProps = language === "en"
    ? anchored ? `no new props besides ${p.anchorProp}` : "no new props"
    : anchored ? `除咗${p.anchorProp}之外冇新道具` : "冇新道具";
  // A bed in this line was getting later clips blocked, so the photo rule names it.
  if (scene.openingPhoto) {
    return language === "en"
      ? `Set: the same person, clothes, and background as the user's opening photo. Do not draw a bookshelf, a bed, or a different room. The same person stays in every clip. Light follows that photo.`
      : `場景：人物、衫同背景跟用戶的開場照片，唔好再畫書架、床或者其他房間。全程同一個人。光跟呢張相。`;
  }
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
    const inFrame = anchored
      ? "Head and torso stay in frame, and the handheld prop stays in frame."
      : "Head and torso stay in frame.";
    if (!size) {
      return ` Camera: a phone fixed on a phone tripod, locked. Lens is 24mm at f/1.8, the face sharp and the background a little soft. ${inFrame} Both hands stay inside the frame. Do not stand up. No microphone. Do not shoot at arm's length. Do not send an arm out of the frame. Do not crop to a face-only close-up.`;
    }
    return ` Camera: locked ${size}, character seated and centered${anchored ? ", handheld prop in frame" : ""}.`;
  }
  if (fullBody) return "鏡頭：鎖定全身，角色置中，頭到腳都在畫面內。";
  const inFrame = anchored ? "頭同上身留喺畫面，手持道具留喺畫面" : "頭同上身留喺畫面";
  if (!size) {
    return `鏡頭：手機固定喺手機腳架，鎖定唔郁。鏡頭係 24mm f/1.8，塊臉清楚、背景少少朦。${inFrame}。兩隻手都留喺畫面入面。唔好企起身，冇咪。唔好用手臂距離，唔好伸隻手出畫面，唔好裁成淨係塊臉。`;
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
  if (rawSpokenSeconds(trimmed, pace) <= SPEECH_MAX_SECONDS) return [trimmed];
  const atoms = speechAtoms(trimmed);
  if (atoms.length <= 1) return [trimmed];
  const parts = Math.max(2, Math.ceil(rawSpokenSeconds(trimmed, pace) / SPEECH_TARGET_SECONDS));
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

// Prefer short slices so each subtitle is one large line. Pack longer only when
// 20 clips cannot hold the script.
function evenRanges(weights: number[], total: number): Array<[number, number]> {
  if (weights.length <= 1 || total <= SPEECH_MAX_SECONDS) return [[0, weights.length]];
  const sliceMax = Math.min(
    TALKING_HEAD_MAX_SECONDS,
    Math.max(SPEECH_MAX_SECONDS, total / TALKING_HEAD_MAX_CLIPS),
  );
  const minClips = Math.max(1, Math.ceil(total / sliceMax));
  const maxClips = Math.min(TALKING_HEAD_MAX_CLIPS, weights.length);
  const target = Math.min(SPEECH_TARGET_SECONDS, sliceMax);
  let best: Array<[number, number]> | undefined;
  let bestCost = Number.POSITIVE_INFINITY;
  for (let groups = minClips; groups <= Math.max(minClips, maxClips); groups += 1) {
    const ranges = partitionEven(weights, groups);
    const seconds = ranges.map(([start, end]) => weightSum(weights, start, end));
    if (seconds.some((value) => value > sliceMax + 0.05)) continue;
    const mean = total / groups;
    const spread = Math.max(...seconds) - Math.min(...seconds);
    const cost = spread * 4 + Math.abs(mean - target);
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
