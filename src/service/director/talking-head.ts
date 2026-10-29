import type { PerformanceSlots } from "@/model/director-performance";
import type { FramePosition, SpeechPace, VoLanguage } from "@/model/project";
import {
  DEFAULT_TALKING_HEAD_BACKGROUND_ID,
  DEFAULT_TALKING_HEAD_POSE_ID,
  getTalkingHeadBackground,
  getTalkingHeadPose,
  talkingHeadPoseOwnsFraming,
  talkingHeadPoseShot,
} from "@/model/talking-head-options";
import { FRAME_COST, FRAMES_COST } from "@/service/credit-costs";
import { chainsClipStarts, inheritsPreviousEnd } from "@/service/director/clip-continuity";
import { DEFAULT_PERFORMANCE, performanceLanguage } from "@/service/director/performance";
import { resolveSpeechPace } from "@/service/director/speech-pace";
import {
  hasAnchorProp,
  planTalkingHeadFacialExpressionArc,
  speakOnlyThisClip,
  talkingMotionLine,
  talkingShotForSkill,
  type TalkingShot,
} from "@/service/director/talking-performance";
import { talkingRealismMotion, talkingRealismStill } from "@/service/director/talking-realism";
import { toWrittenChinese } from "@/service/director/written-chinese";
import { mediaSrc } from "@/util/media-src";

export const TALKING_HEAD_SKILL_SLUG = "talking-head-director";
export const FULL_BODY_TALKING_HEAD_SKILL_SLUG = "full-body-talking-head-director";
export const TALKING_HEAD_MAX_CLIPS = 20;
export const TALKING_HEAD_MAX_SECONDS = 120;
const FULL_BODY_MAX_SECONDS = 12;
const TALKING_HEAD_MAX_TOTAL_SECONDS = 240;
// Legacy full-body speech target per clip (5–8s, expandable to 12s).
const SPEECH_TARGET_SECONDS = 5;
const SPEECH_MAX_SECONDS = 8;

// Medium pace: ~2.4 English words/s, ~4 Chinese characters/s.
const ENGLISH_WORDS_PER_SECOND = 2.4;
const CJK_CHARS_PER_SECOND = 4;
// MiniMax renders at least 5s. A shorter storyboard clip is sped up afterwards.
const PROVIDER_MIN_SECONDS = 5;

const TALKING_HEAD_SKILLS = new Set([TALKING_HEAD_SKILL_SLUG, FULL_BODY_TALKING_HEAD_SKILL_SLUG]);

export function isTalkingHeadSkill(skillSlug?: string) {
  return Boolean(talkingShotForSkill(skillSlug) || (skillSlug && TALKING_HEAD_SKILLS.has(skillSlug)));
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
    void _error;
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

// Director instruction is optional for talking-head, including a blank note.
// Spoken lines are checked by talkingHeadSpokenError.
export function talkingHeadSourceError(source: string) {
  void source;
  return undefined;
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
  const limit = TALKING_HEAD_MAX_TOTAL_SECONDS;
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
  motionPrompt?: string;
  expressiveness?: "low" | "medium" | "high";
  englishVo: string;
  bgmSfx: string;
};

// 9:16 Instagram Reels sit the subtitle just under the middle. Landscape stays at the bottom.
function talkingHeadSubtitleBelowCenter(aspectRatio?: string) {
  return aspectRatio === "9:16";
}

// Detect when the director instruction or Phase A visualWorld specifies a custom background/location
// (e.g. "Change the background at office, with HK sea view" or "中環海景寫字樓") so we do not
// overwrite it with the default home sofa + bookshelf slot.
const CUSTOM_SET_INSTRUCTION_RE =
  /\b(background|backdrop|setting|set\s+(?:in|at|to)|scene\s+(?:in|at)|location|office|sea\s*view|harbou?r|studio|cafe|coffee\s*shop|restaurant|classroom|library|kitchen|gym|park|street|rooftop|beach|hotel|hospital|clinic|lab|laboratory|workshop|store|shop|showroom|conference\s*room|boardroom|balcony|garden)\b|背景|場景|環境|辦公室|寫字樓|海景|維港|課室|教室|圖書館|咖啡店|餐廳|廚房|健身室|公園|街頭|戶外|天台|海灘|酒店|診所|醫院|實驗室|工作室|會議室|露台|花園|商場|車廂/i;

const DEFAULT_HOME_SET_RE =
  /\b(sofa|couch|bookshelf|bookcase|bedroom|bedhead|door frame|side window)\b|沙發|梳化|書架|書櫃|睡房|床頭|門框|側窗/i;

export function extractCustomTalkingHeadSet(
  directorInstruction?: string,
  visualWorld?: string,
): string | undefined {
  const rawInstruction = (directorInstruction || "").trim();
  const hasInstructionSet =
    rawInstruction.length > 0 &&
    CUSTOM_SET_INSTRUCTION_RE.test(rawInstruction) &&
    !DEFAULT_HOME_SET_RE.test(rawInstruction);

  const cleanedInstruction = hasInstructionSet
    ? rawInstruction
        .replace(
          /^(?:please\s+)?(?:change|set|switch|move|put|make|use|keep)\s+(?:the\s+)?(?:background|backdrop|setting|scene|location|room)\s*(?:to|at|in|as|with|for|:|—|-)?\s*/i,
          "",
        )
        .replace(/^(?:background|backdrop|setting|scene|location|room)\s*(?:is|at|in|to|:|：|-|—)\s*/i, "")
        .replace(
          /^(?:請)?(?:將|把|幫我將|幫我把)?(?:背景|場景|環境|房間)(?:改為|改成|改做|換成|換做|設為|設定為|設喺|喺|在)?\s*[:：]?\s*/u,
          "",
        )
        .replace(/[.。!！]+$/u, "")
        .trim()
    : "";

  const rawWorld = (visualWorld || "").trim();
  const cleanedWorld = rawWorld
    .split(/(?:[。.]|，(?=全程單一|畫面乾淨|無任何文字|配搭\s*35mm))/u)[0]
    ?.trim()
    .replace(/[.。，,]+$/u, "")
    .trim();
  const hasWorldSet =
    Boolean(cleanedWorld) &&
    CUSTOM_SET_INSTRUCTION_RE.test(cleanedWorld) &&
    !DEFAULT_HOME_SET_RE.test(cleanedWorld);

  if (hasWorldSet && cleanedInstruction) {
    if (cleanedWorld.toLowerCase().includes(cleanedInstruction.toLowerCase())) {
      return cleanedWorld;
    }
    return `${cleanedWorld} (${cleanedInstruction})`;
  }
  if (cleanedInstruction) return cleanedInstruction;
  if (hasWorldSet) return cleanedWorld;
  return undefined;
}

export function extractArgonFacialChoreography(motionCamera?: string): string | undefined {
  const text = (motionCamera || "").trim();
  if (!text) return undefined;
  const labeledMatch = text.match(
    /(?:導演逐句微表情(?:編排|規劃)|Director (?:sentence-by-sentence facial expression choreography|content-driven micro-expression plan))[：:]\s*([^\n]+(?:\n(?!Realism:|真實感：)[^\n]+)*)/i,
  );
  if (labeledMatch?.[0]) {
    return labeledMatch[0]
      .replace(/\s*(?:Realism:|真實感：)[\s\S]*$/i, "")
      .trim();
  }
  if (/好奇|疑惑|興奮|凝重|認真|Curiosity|Puzzled|Excitement|Serious|Empathetic/i.test(text)) {
    const cleaned = text
      .replace(/\s*(?:Realism:|真實感：)[\s\S]*$/i, "")
      .trim();
    if (cleaned.length >= 24) {
      return /導演逐句|Director/i.test(cleaned)
        ? cleaned
        : `導演逐句微表情編排：${cleaned}`;
    }
  }
  return undefined;
}

export function planTalkingHeadClips(input: {
  source: string;
  // Optional director instruction (e.g. custom background/setting notes) and Phase A visualWorld.
  directorInstruction?: string;
  visualWorld?: string;
  // Optional Argon-generated clips from Phase A so we preserve Argon's sentence-by-sentence facial choreography, motionPrompt, expressiveness, and subtitleCues.
  argonClips?: Array<{
    clipNumber?: number;
    motionCamera?: string;
    motionPrompt?: string;
    expressiveness?: "low" | "medium" | "high";
    subtitleCues?: string[];
    englishVo?: string;
  }>;
  pace?: SpeechPace;
  language?: VoLanguage;
  aspectRatio?: string;
  // From the director visual, e.g. "full-body". Omitted when the director names no shot.
  shot?: string;
  // Uploaded room photos replace the set sentence.
  background?: boolean;
  // Preset background id from TALKING_HEAD_BACKGROUNDS.
  talkingHeadBackgroundId?: string;
  // Preset pose id from TALKING_HEAD_POSES.
  talkingHeadPoseId?: string;
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
  const poseForcesFullBody = talkingHeadPoseShot(input.talkingHeadPoseId) === "full-body";
  const talkingShot: TalkingShot =
    poseForcesFullBody || input.shot === "full-body" ? "full-body" : "face";
  const resolvedShot = poseForcesFullBody ? "full-body" : input.shot;
  // Legacy full-body-talking-head-director sets input.shot === "full-body" and uses 5–12s clips.
  // talking-head-director with a full-body pose keeps the single long-clip (120s) budget.
  const legacyShortClips = input.shot === "full-body" && !poseForcesFullBody;
  const maxClipSeconds = legacyShortClips ? FULL_BODY_MAX_SECONDS : TALKING_HEAD_MAX_SECONDS;
  const lines = balanceTalkingHeadLines(input.source, input.pace, {
    maxClipSeconds,
    speechMaxSeconds: legacyShortClips ? SPEECH_MAX_SECONDS : TALKING_HEAD_MAX_SECONDS,
    speechTargetSeconds: legacyShortClips ? SPEECH_TARGET_SECONDS : TALKING_HEAD_MAX_SECONDS,
  });
  const total = lines.length;
  const clips: TalkingHeadClipPlan[] = [];
  const basePerf =
    input.performance ?? DEFAULT_PERFORMANCE[talkingShot][performanceLanguage(input.language)];
  const selectedBg = getTalkingHeadBackground(input.talkingHeadBackgroundId);
  const selectedPose = getTalkingHeadPose(input.talkingHeadPoseId);
  const isZh = isChineseScaffolding(input.language);
  const perf: PerformanceSlots = {
    ...basePerf,
    ...(selectedBg
      ? {
          set: isZh ? selectedBg.setYue : selectedBg.setEn,
          light: isZh ? selectedBg.lightYue : selectedBg.lightEn,
        }
      : {}),
    ...(selectedPose
      ? {
          gestureLibrary: isZh ? selectedPose.gestureYue : selectedPose.gestureEn,
        }
      : {}),
  };
  const customSet = extractCustomTalkingHeadSet(input.directorInstruction, input.visualWorld);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const seconds = plannedClipSeconds(line, input.pace, maxClipSeconds);
    const belowCenter = talkingHeadSubtitleBelowCenter(input.aspectRatio);
    const scene = {
      shot: resolvedShot,
      belowCenter,
      background: input.background,
      talkingHeadBackgroundId: input.talkingHeadBackgroundId,
      talkingHeadPoseId: input.talkingHeadPoseId,
      openingPhoto: input.openingPhoto,
      customSet,
      perf,
      overlay: true,
      realistic: input.realistic,
      clipIndex: index,
    };
    const realism = {
      fullBody: talkingShot === "full-body",
      openingPhoto: input.openingPhoto,
      poseOwnsFraming: talkingHeadPoseOwnsFraming(input.talkingHeadPoseId),
    };
    const endScene = shotLine(input.language, "end", line, scene);
    const previousLine = index === 0 ? undefined : lines[index - 1];
    const nextLine = index + 1 < lines.length ? lines[index + 1] : undefined;
    // Pose continues from the previous end. Subtitles are never drawn into stills.
    const startScene =
      index === 0
        ? shotLine(input.language, "start", line, scene)
        : withThisClipSubtitle(
            clips[index - 1].endScene,
            input.language,
            line,
            belowCenter,
            true,
          );
    const argonRow =
      lines.length === 1 && input.argonClips && input.argonClips.length > 1
        ? {
            motionCamera: [
              "導演逐句微表情編排：",
              ...input.argonClips
                .map((c, idx) => {
                  const extracted = extractArgonFacialChoreography(c.motionPrompt || c.motionCamera);
                  if (!extracted) return "";
                  const body = extracted
                    .replace(
                      /^(?:導演逐句微表情(?:編排|規劃)|Director (?:sentence-by-sentence facial expression choreography|content-driven micro-expression plan))[：:]\s*/i,
                      "",
                    )
                    .trim();
                  return body ? `[第${idx + 1}段] ${body}` : "";
                })
                .filter(Boolean),
            ].join("；"),
            motionPrompt: input.argonClips
              .map((c) => c.motionPrompt?.trim())
              .filter(Boolean)
              .join(" "),
            expressiveness:
              input.argonClips.find((c) => c.expressiveness)?.expressiveness ?? "medium",
            subtitleCues: input.argonClips.flatMap((c) => c.subtitleCues ?? []),
          }
        : input.argonClips?.[index];
    const argonFacialChoreography = extractArgonFacialChoreography(
      argonRow?.motionPrompt || argonRow?.motionCamera,
    );
    const resolvedExpressiveness = argonRow?.expressiveness ?? "medium";
    const resolvedMotionPrompt =
      argonRow?.motionPrompt?.trim() ||
      argonFacialChoreography ||
      planTalkingHeadFacialExpressionArc(line, input.language);
    const resolvedSubtitleCues =
      argonRow?.subtitleCues && argonRow.subtitleCues.length > 0
        ? argonRow.subtitleCues.map((c) => c.trim()).filter(Boolean)
        : undefined;
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
          overlay: false,
          noText: true,
          nextLine,
          directorFacialChoreography: argonFacialChoreography,
        }),
        input.realistic ? talkingRealismMotion(input.language, realism) : "",
      ),
      motionPrompt: resolvedMotionPrompt,
      expressiveness: resolvedExpressiveness,
      ...(resolvedSubtitleCues ? { subtitleCues: resolvedSubtitleCues } : {}),
      englishVo: line,
      bgmSfx: input.language === "yue" || input.language === "zh" ? "無" : "none",
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
  subtitleHandoff?: boolean;
}) {
  const row = input.phaseA.clips.find((clip) => clip.clipNumber === input.clipNumber);
  const prompt = row?.motionCamera?.trim();
  if (!row || !prompt) return undefined;
  const index = input.phaseA.clips.findIndex((clip) => clip.clipNumber === input.clipNumber);
  const previous = index > 0 ? input.phaseA.clips[index - 1]?.englishVo : undefined;
  const spoken = previous ? speakOnlyThisClip(prompt, row.englishVo || "", input.language) : prompt;
  return {
    clipNumber: input.clipNumber,
    durationSeconds: row.durationSeconds,
    prompt: spoken,
  };
}

export function talkingHeadDurationHint(pace?: SpeechPace, skillSlug?: string) {
  const fullBody = skillSlug === FULL_BODY_TALKING_HEAD_SKILL_SLUG;
  return [
    fullBody ? "Full-body talking-head read: ignore the duration preset." : "Talking-head read: ignore the duration preset.",
    "The first user text is a DIRECTOR INSTRUCTION for staging and tone. The second user text is the SPOKEN SCRIPT — copy the words into englishVo verbatim.",
    `Pack a spoken script of <= ${TALKING_HEAD_MAX_SECONDS}s into a SINGLE clip (clipCount = 1) containing the entire spoken script in order so you can write one complete sentence-by-sentence facial expression choreography across all sentences in Clip 1's motionCamera. Only split into multiple clips (up to ${TALKING_HEAD_MAX_CLIPS}) when total speech exceeds ${TALKING_HEAD_MAX_SECONDS}s. Never cut through a complete English word such as Instagram, Webinar, or Scro.io.`,
    `durationSeconds follows Chinese characters / ${CJK_CHARS_PER_SECOND} + English words / ${ENGLISH_WORDS_PER_SECOND}, then ${paceNote(pace)}.`,
    fullBody
      ? "Locked full-body shot. Head, torso, and feet stay in frame. The character looks into the lens. Do not crop to a close-up."
      : "Handheld iPhone front-camera selfie at 30–40cm, 24mm at f/1.8, cropped collarbone/upper-chest up so the face fills 60–65% of vertical 9:16. Organic 1–2° handheld micro-sway. No waist, lap, thighs, or hands in frame. No microphone. The character sits and looks into the lens. Do not stand them up.",
    "Clip 2+ keeps the previous clip's pose, set, and camera, but both stills show this clip's own spoken line as the subtitle. Never copy the previous clip's words into this clip's subtitle or voice. The camera does not jump: the end still is the same crop, distance, and screen position as the start still. Only the mouth, a few degrees of head, and the hands change. Motion is continuous lip-sync: eyes on the lens, head tilting and nodding, both hands gesturing. The voice says only this clip's line, once.",
  ].join(" ");
}

// Phase A director block. Performance slots (English) describe the style layer the
// user may have customised; the pipeline rules around them are fixed.
export function talkingHeadDirectorBlock(
  skillSlug?: string,
  _aspectRatio?: string,
  performance?: PerformanceSlots,
  _overlay?: boolean,
  _noText?: boolean,
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
      : `This is a TALKING-HEAD READ. Exactly one character is on screen for the whole video: they film a handheld iPhone selfie close-up, face the camera${anchored ? `, and hold ${p.anchorProp}` : ""}, and speak. There is no cutaway, no crowd, and no second character. No microphone.`,
    "The director instruction is planning notes only (tone, emphasis, must-have looks). It is NOT spoken.",
    "The spoken script is locked. Give every clip a full, well-paced spoken line (~22–28 Chinese/Cantonese characters or ~12–16 English words per 5s clip) so speech fills the entire clip from 0s to the end without dead silence at the start or end; if a clause is too short for a 5s clip, combine or naturally expand it so no clip has a short VO.",
    fullBody
      ? `Camera is a locked full-body shot. Do not crop to a close-up or a medium shot. Set: ${p.set}. Light: ${p.light}. Set and light stay identical across every clip. Clip 2 and after open on the previous clip's end still.`
      : `Camera is a handheld iPhone front-camera selfie at 30–40cm. The lens is 24mm at f/1.8, cropped from collarbone/upper-chest up so the face fills 60–65% of the vertical 9:16 frame (subtle 10° high-angle; no waist, lap, thighs, or hands in frame)${anchored ? `, and the handheld prop stays in frame` : ""}. Organic 1–2° handheld micro-sway. Set: ${p.set}. Light: ${p.light}. Same set and light in every clip. No pictures pasted on the frame. No microphone. Do not stand the character up. Clip 2 and after open on the previous clip's end still.`,
    fullBody
      ? `On-camera speech like a real person recording a reel: eyes locked on the lens, continuous lip-sync, head tilting and nodding, ${hands}, weight shifting hip to hip. Never freeze the face, head, hands, or body. Never a greeting wave.`
      : `On-camera handheld selfie speech: seated, eyes locked on the lens, continuous speech-energy lip-sync with moist lips, head tilting and nodding, ${hands}. Natural skin, real cloth, unposed. Never freeze the face or neck into a presenter smile. Never a greeting wave. Never stand up.`,
    `Face pattern (facial micro-expressions should be clearly readable and expressive ~3–4mm with 2–3° head language — neither a frozen poker face nor exaggerated theatrical laughing; NEVER just laugh or hold a constant smile): resting face is ${p.restingFace}. Emphasis: ${p.emphasisBeat}. Clip 1 opens with ${p.hookBeat} as the hook. The last clip ends on ${p.ctaBeat}.`,
    "CRITICAL DIRECTOR FACIAL CHOREOGRAPHY (`motionPrompt`, `expressiveness`, and `motionCamera`): As the Director, you MUST analyze every sentence/clause of the spoken script and populate each clip's `motionPrompt` and `expressiveness` fields (as well as `motionCamera`): (1) Set `expressiveness` to `\"medium\"` by default (use `\"low\"` only for deadpan/somber scripts; NEVER use `\"high\"` unless the user explicitly asks for high-energy acting, as `\"high\"` distorts mouth shapes); (2) In `motionPrompt` (and `motionCamera`, prefixed with `導演逐句微表情編排：` for Cantonese/Chinese or `Director sentence-by-sentence facial expression choreography:` for English), write a detailed sentence-by-sentence facial expression choreography covering EVERY sentence in the script: specify the time window, the quoted clause, the emotion label (e.g. 好奇提問/Curiosity, 疑惑反問/Puzzled doubt, 認真凝重/Serious concern, 共鳴無奈/Empathetic understanding, 篤定自信/Earnest conviction, 驚喜亮點/Bright excitement, or 親切邀請/Warm invitation), and the clear ~3–4mm brow/eye micro-acting and 2–3° head language while keeping natural co-articulated lip-sync (~25–30% jaw opening, lower teeth covered by the lower lip, never laughing through serious lines).",
    _aspectRatio === "16:9"
      ? "SUBTITLE SEGMENTATION (`subtitleCues` array per clip): Split `englishVo` into natural semantic subtitle phrases in `subtitleCues` (preserving every word verbatim in order). Because this is a 16:9 landscape video (subtitle sits at the bottom), each `subtitleCues` item can be a full clause of ~8–12 English words (~44–60 characters) or ~14–22 Chinese/Cantonese characters. Never break inside a compound token like `Scro.io`."
      : "SUBTITLE SEGMENTATION (`subtitleCues` array per clip): Split `englishVo` into short, punchy semantic subtitle phrases in `subtitleCues` (preserving every word verbatim in order) so each subtitle cue can be rendered LARGE on a 9:16 vertical Reel (subtitle sits just below the vertical middle). Keep each `subtitleCues` item to ~4–7 English words (~20–34 characters) or ~7–12 Chinese/Cantonese characters, breaking cleanly at natural grammatical boundaries, conjunctions (`and`, `or`, `but`, `so`, `to`, `that`, `when`, `if`), or em-dashes (`—`). Never break inside a compound token like `Scro.io`.",
    `Gesture pattern: the gesturing hand changes shape every 1–2 seconds in time with the words — ${p.gestureLibrary}. Head: ${p.headMotion}. Alternate the ending head tilt and active gesturing hand across clips so two clips in a row never settle in the exact same head angle or hand pose.`,
    ...(realistic
      ? ["Realism (Cinematic realistic): every still is shot on a handheld iPhone 16 Pro 24mm f/1.8 selfie or Sony ZV-E1 / DJI Osmo Pocket 3 CMOS sensor (clean true-to-life digital color, zero heavy 35mm film grain or retro LUT) at 30–40cm collarbone-up framing with the face filling 60–65% of 9:16, naming soft, even, diffused ambient indoor light or gentle window daylight with a low, gradual tonal transition across the face (soft minimal shadows under the chin and around the eyes, never harsh dramatic side-light contrast, never a half-dark face, never flat beauty-ring glare, keep highlights soft below clipping), unfiltered non-reflective diffuse matte real skin pores and fine facial hair (zero skin reflectivity, zero shiny hot spots), and a lived-in room corner (bedhead/door/window) with natural optical shallow depth of field and no foreground objects blocking the frame."]
      : []),
    "The frame has no letters, no subtitle, no caption, no logo, and no writing. The spoken line is voice only.",
    "Each clip's voice says only that clip's own line, once. Never repeat the previous clip's sentence.",
  ].join(" ");
}

function paceNote(pace?: SpeechPace) {
  const speed = resolveSpeechPace(pace);
  if (speed === "slow") return "divide by 0.8 because the pace is slow";
  if (speed === "fast") return "divide by 1.2 because the pace is fast";
  return "keep that number because the pace is medium";
}

function isChineseScaffolding(language?: VoLanguage) {
  return language === "yue" || language === "zh";
}

function jobLine(language: VoLanguage | undefined, index: number, total: number) {
  if (!isChineseScaffolding(language)) return `clip ${index} of ${total}`;
  return `第 ${index} 段，共 ${total} 段`;
}

// At least the provider minimum, so a short line is not sped up after render.
function plannedClipSeconds(
  text: string,
  pace?: SpeechPace,
  maxSeconds = TALKING_HEAD_MAX_SECONDS,
) {
  return Math.min(maxSeconds, Math.max(PROVIDER_MIN_SECONDS, talkingHeadSeconds(text, pace)));
}

type SceneInput = {
  shot?: string;
  belowCenter?: boolean;
  background?: boolean;
  talkingHeadBackgroundId?: string;
  talkingHeadPoseId?: string;
  openingPhoto?: boolean;
  customSet?: string;
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
    poseOwnsFraming: talkingHeadPoseOwnsFraming(scene.talkingHeadPoseId),
  });
  return !isChineseScaffolding(language) ? `${still.trim()} ${clause}` : `${still.trim()}${clause}`;
}

function withMotionRealism(motion: string, clause: string) {
  if (!clause) return motion;
  const text = motion.trim();
  return `${text}${/[.。]$/.test(text) ? "" : "."} ${clause}`;
}

function endPoseVariationEn(
  clipIndex: number,
  fullBody: boolean,
  anchored: boolean,
  freeHand: string,
  omitDefaultSofa?: boolean,
) {
  const variant = clipIndex % 6;
  if (anchored) {
    const headMoves = [
      "facing the camera with eyes on the lens, mouth just closed into a small real smile, eyebrows relaxed, head tilted gently 5 degrees to the left and torso leaning slightly forward",
      "facing the camera straight-on with head tilted gently 5 degrees to the right and eyes locked on the lens in a thoughtful pause, mouth just closed into a soft half-smile, seated weight shifted slightly right",
      "facing the camera with eyes on the lens, mouth just closed into an engaged warm smile, torso settled back into the cushion with head tilted gently to the right",
      "facing the camera with chin slightly lifted, head tilted gently left, eyes locked on the lens, mouth just closed into a lively knowing smile",
      "facing the camera with eyes locked on the lens, mouth just closed into a confident smile, eyebrows softly lifted, seated weight shifted slightly left with head upright",
      "facing the camera with eyes locked on the lens, mouth just closed into a warm conversational smile, leaning in closer toward the camera with head tilted slightly left",
    ];
    const handMoves = [
      `${freeHand} is open-palm at chest height, caught between gestures`,
      `${freeHand} is held at chest height with a relaxed open conversational palm`,
      `${freeHand} is at chest height with fingers spread in a relaxed shrug`,
      `${freeHand} is at chest height with the index finger lightly raised on the key point`,
      `${freeHand} is at chest height with an open palm angled toward the lens`,
      `${freeHand} rests lightly near mid-chest with a relaxed open hand`,
    ];
    return { head: headMoves[variant], hand: handMoves[variant] };
  }
  const rawHeadMoves = [
    "collarbone-up selfie close-up, face filling 60–65% of frame, facing the camera with head tilted gently 1–2 degrees to the right, both pupils centered and eyes on the lens, mouth just closed into a warm engaged smile, eyebrows relaxed",
    "collarbone-up selfie close-up, face filling 60–65% of frame, facing the camera straight-on with head tilted gently 1–2 degrees to the left and both eyes locked on the lens, mouth just closed into a thoughtful half-smile",
    "collarbone-up selfie close-up, face filling 60–65% of frame, facing the camera with head tilted gently 1–2 degrees to the left, eyes locked on the lens, eyebrows lifted, mouth just closed into a lively confident smile",
    "collarbone-up selfie close-up, face filling 60–65% of frame, facing the camera straight-on, head tilted gently 1–2 degrees right with both eyes locked on the lens, mouth just closed into a natural soft smile",
    "collarbone-up selfie close-up, face filling 60–65% of frame, facing the camera with head tilted gently 1–2 degrees to the left, eyes locked on the lens, mouth just closed into a knowing smile",
    "collarbone-up selfie close-up, face filling 60–65% of frame, facing the camera with head tilted gently 1–2 degrees right, mouth just closed into a warm expressive smile, eyes locked on the lens",
  ];
  const headMoves = omitDefaultSofa
    ? rawHeadMoves
    : rawHeadMoves;
  const handMoves = fullBody
    ? [
        "One hand is slightly raised at chest height with an open palm while the other arm relaxes at the side, weight on the other hip",
        "The left hand gestures at chest height with a relaxed open conversational palm while the right hand rests low, weight shifted to the right hip",
        "One hand gestures softly at chest height with an open palm while the other arm relaxes at the side, posture relaxed",
        "One hand gestures outward at chest height with fingers spread while the other hand rests near the waist, facing the camera",
        "The right hand is raised at chest height with an open conversational palm while the left arm relaxes at the side, weight on the left hip",
        "One hand offers a calm open palm at chest height toward the lens while the other arm relaxes at the side",
      ]
    : [
        "No hands, waist, lap, or thighs visible in frame — crop ends at collarbone/upper chest",
        "No hands, waist, lap, or thighs visible in frame — crop ends at collarbone/upper chest",
        "No hands, waist, lap, or thighs visible in frame — crop ends at collarbone/upper chest",
        "No hands, waist, lap, or thighs visible in frame — crop ends at collarbone/upper chest",
        "No hands, waist, lap, or thighs visible in frame — crop ends at collarbone/upper chest",
        "No hands, waist, lap, or thighs visible in frame — crop ends at collarbone/upper chest",
      ];
  return { head: headMoves[variant], hand: handMoves[variant] };
}

function endPoseVariationYue(clipIndex: number, fullBody: boolean, anchored: boolean, freeHand: string) {
  const variant = clipIndex % 6;
  if (anchored) {
    const headMoves = [
      "正面直望鏡頭，呢句講完、口部合上變成自然淺笑，眉毛放鬆，坐姿保持置中、頭向左邊微傾 1–2 度",
      "正面對住鏡頭、頭向右微傾 1–2 度，雙眼直望鏡頭帶住思考神情，口部合上帶住淺笑，坐姿保持置中",
      "正面直望鏡頭，呢句講完、口部合上變成有神嘅淺笑，坐姿保持置中放鬆、頭向右邊微傾 1–2 度",
      "正面對住鏡頭，呢句講完、口部合上變成親切淺笑，雙眼直望鏡頭、頭向左微傾 1–2 度",
      "正面直望鏡頭，呢句講完、口部合上帶住自信微笑，坐姿保持置中",
      "正面直望鏡頭，呢句講完、口部合上變成溫柔淺笑，上身微微傾近鏡頭",
    ];
    const handMoves = [
      `${freeHand}自然放鬆放喺大髀休息位`,
      `${freeHand}自然放鬆放喺大髀休息位`,
      `${freeHand}自然放鬆放喺大髀休息位`,
      `${freeHand}自然放鬆放喺大髀休息位`,
      `${freeHand}自然放鬆放喺大髀休息位`,
      `${freeHand}自然放鬆放喺大髀休息位`,
    ];
    return { head: headMoves[variant], hand: handMoves[variant] };
  }
  const headMoves = [
    "正面直望鏡頭，呢句講完、口部合上變成自然淺笑，眉毛放鬆，坐姿保持置中、頭向左邊微傾 1–2 度",
    "正面對住鏡頭、頭向右微傾 1–2 度，雙眼直望鏡頭，口部合上帶住思考淺笑，坐姿保持置中穩定",
    "正面直望鏡頭，呢句講完、口部合上變成有神嘅淺笑，坐姿保持置中放鬆、頭向右邊微傾 1–2 度",
    "正面對住鏡頭，呢句講完、口部合上變成親切淺笑，頭向左微傾 1–2 度，雙眼直望鏡頭，坐姿保持置中穩定",
    "正面直望鏡頭，呢句講完、口部合上帶住自信微笑，坐姿保持置中穩定",
    "正面直望鏡頭，呢句講完、口部合上變成溫柔淺笑，上身微微傾近鏡頭好似講緊秘密",
  ];
  const handMoves = fullBody
    ? [
        "一隻手仲喺胸前掌心打開，另一隻手自然垂低，重心輕輕換去另一邊，腳留喺同一個位置",
        "一隻手喺胸前掌心自然打開做傾偈手勢，另一隻手放低，重心換去右邊，腳留喺同一個位置",
        "一隻手喺胸前自然微開，另一隻手自然垂低，身形放鬆，腳留喺同一個位置",
        "一隻手喺胸前向外輕推做手勢，另一隻手放喺腰旁，正面對住鏡頭，腳留喺同一個位置",
        "一隻手喺胸前掌心自然打開比畫，另一隻手自然垂低，腳留喺同一個位置",
        "一隻手掌心向鏡頭自然遞出，另一隻手自然垂低，腳留喺同一個位置",
      ]
    : [
        "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
        "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
        "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
        "雙手已經自然收返落大髀休息位置，正面對住鏡頭，坐姿保持置中穩定",
        "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
        "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
      ];
  return { head: headMoves[variant], hand: handMoves[variant] };
}

// Start still: hook face, free hand mid-gesture. End still: smile relaxed, head tilted the other way.
function shotLine(language: VoLanguage | undefined, moment: "start" | "end", line: string, scene: SceneInput) {
  const selectedPose =
    scene.talkingHeadPoseId && scene.talkingHeadPoseId !== DEFAULT_TALKING_HEAD_POSE_ID
      ? getTalkingHeadPose(scene.talkingHeadPoseId)
      : undefined;
  const useEn = !isChineseScaffolding(language);
  const camera = selectedPose
    ? useEn
      ? ` ${selectedPose.cameraEn}`
      : selectedPose.cameraYue
    : cameraClause(language, scene.shot, scene.perf);
  const fullBody = scene.shot === "full-body";
  const anchored = hasAnchorProp(scene.perf);
  const p = scene.perf;
  const clipIndex = scene.clipIndex ?? 0;
  if (scene.openingPhoto && moment === "start") {
    const pose = useEn
      ? "Character: the only person in the frame. Match the attached opening photo exactly: same face, hair, clothes, body, and pose. They look into the lens, mouth just opening."
      : "角色：畫面只有呢一個人。跟附上的開場照片：同一張臉、頭髮、衫、身形同姿勢。直望鏡頭，準備開口。";
    const still = withStillRealism(
      useEn
        ? `${pose} ${setClause("en", scene)}${camera}`
        : `${pose}${setClause("yue", scene)}${camera}`,
      language,
      scene,
    );
    if (scene.overlay) return still.trim();
    const painted = language === "yue" ? toWrittenChinese(line) : line;
    return useEn
      ? `${still} ${subtitleSentence("en", painted, scene.belowCenter)}`
      : `${still}${subtitleSentence("yue", painted, scene.belowCenter)}`;
  }
  const hasNonDefaultBg = Boolean(
    scene.talkingHeadBackgroundId &&
      scene.talkingHeadBackgroundId !== DEFAULT_TALKING_HEAD_BACKGROUND_ID &&
      getTalkingHeadBackground(scene.talkingHeadBackgroundId),
  );
  if (useEn) {
    const prop = anchored ? ` One hand holds ${p.anchorProp}.` : "";
    const propEnd = anchored ? ` The same hand still holds ${p.anchorProp}.` : "";
    const freeHand = anchored ? "The other hand" : "One hand";
    const sameFrame = selectedPose
      ? " Same camera, body posture, and framing as the opening still: same crop, same distance, with only a subtle 1–2 degree natural head and facial expression transition. No zoom, no reframe, no jump."
      : fullBody
        ? " Same camera, seated torso position, and resting hand position on the lap as the opening still: same crop, same distance, with only a subtle 1–2 degree natural head and facial expression transition. No zoom, no reframe, no jump."
        : " Same camera and collarbone-up selfie crop as the opening still: face still fills 60–65% of frame, same distance, with only a subtle 1–2 degree natural head and facial expression transition. No zoom, no reframe, no jump, no hands entering frame.";
    const endVar = endPoseVariationEn(
      clipIndex,
      fullBody,
      anchored,
      freeHand,
      Boolean(scene.customSet || scene.background || scene.openingPhoto || hasNonDefaultBg),
    );
    const pose =
      moment === "start"
        ? selectedPose
          ? selectedPose.startPoseEn
          : fullBody
            ? `Character: the only person in the frame, centered, eyes locked into the lens as if talking into a phone, with a natural mid-speech softly parted mouth (~4–6mm gap showing a subtle hint of the real upper front teeth from the reference photo as an oral anchor, lower teeth covered by the lower lip, cheeks relaxed and un-smiled, calm open eyes), ${p.hookBeat}, head tilted a few degrees, a live thinking expression.${prop} ${freeHand} is already up at chest height with the index finger raised mid-gesture${anchored ? "" : ", the other arm relaxed at the side"}.`
            : `Character: intimate collarbone-up selfie close-up of the only person in the frame (face fills 60–65% of the vertical 9:16 frame; NO waist, NO lap, NO thighs, NO hands visible), eyes locked into the lens with a natural mid-speech softly parted mouth (~4–6mm gap showing a subtle hint of the real upper front teeth from the reference photo as an oral anchor, lower teeth covered by the lower lip, cheeks relaxed and un-smiled, calm open eyes), ${p.hookBeat}, head tilted 1–2 degrees, a live unposed expression.${prop}`
        : selectedPose
          ? `${selectedPose.endPoseEn}${sameFrame}`
          : fullBody
            ? `Character: still the only person in the frame, ${endVar.head}.${propEnd} ${anchored ? `${endVar.hand}, weight on the other hip` : endVar.hand}, feet in the same place.${sameFrame}`
            : `Character: still an intimate collarbone-up selfie close-up, ${endVar.head}. ${endVar.hand}.${propEnd}${sameFrame}`;
    const still = withStillRealism(`${pose} ${setClause("en", scene)}${camera}`, language, scene);
    // Overlay subtitles are composited later, so the still is pose, set, and camera only.
    if (scene.overlay) return still.trim();
    return `${still} ${subtitleSentence("en", line, scene.belowCenter)}`;
  }
  const prop = anchored ? `一隻手拎住${p.anchorProp}。` : "";
  const propEnd = anchored ? `同一隻手仍然拎住${p.anchorProp}。` : "";
  const freeHand = anchored ? "另一隻手" : "一隻手";
  const sameFrame = selectedPose
    ? "鏡頭、站姿或坐姿同開頭畫面一致：同一個裁切、同一距離，只有 1–2 度極細微嘅頭部與表情自然過渡。唔好變焦，唔好跳鏡。"
    : fullBody
      ? "鏡頭、軀幹坐姿同雙手放喺大髀嘅休息位置同開頭畫面一致：同一個裁切、同一距離，只有 1–2 度極細微嘅頭部與表情自然過渡。唔好變焦，唔好跳鏡。"
      : "鏡頭同鎖骨以上自拍裁切同開頭畫面一致：塊臉仍然佔畫面 60–65%，同一距離，只有 1–2 度極細微嘅頭部與表情自然過渡。唔好變焦，唔好跳鏡，雙手唔入鏡。";
  const endVarYue = endPoseVariationYue(clipIndex, fullBody, anchored, freeHand);
  const lensPlaceYue =
    scene.customSet || scene.background || hasNonDefaultBg
      ? "直望鏡頭好似用手持手機自拍"
      : "直望鏡頭好似喺屋企用手持手機自拍";
  const pose =
    moment === "start"
      ? selectedPose
        ? selectedPose.startPoseYue
        : fullBody
          ? `角色：畫面只有呢一個人，置中，直望鏡頭好似對住手機講，正準備開口講第一隻字嘅自然微啟唇神情（雙唇自然微啟約 4–6mm、隱約露出少少參考相片中真實自然嘅上排門牙作為牙齒基準、下唇遮住下排牙齒、面頰完全放鬆唔係大笑、唔擠蘋果肌、雙眼自然張開唔瞇眼），${p.hookBeat}，頭微傾，神情有生氣。${prop}${freeHand}已經提到胸前豎起食指做緊手勢${anchored ? "" : "，另一隻手自然垂低"}。`
          : `角色：鎖骨以上自拍大特寫，畫面只有呢一個人（塊臉佔 9:16 直式畫面 60–65%；唔好見到腰、大髀或雙手），${lensPlaceYue}，正準備開口講第一隻字嘅自然微啟唇神情（雙唇自然微啟約 4–6mm、隱約露出少少參考相片中真實自然嘅上排門牙作為牙齒基準、下唇遮住下排牙齒、面頰完全放鬆唔係大笑、唔擠蘋果肌、雙眼自然張開唔瞇眼），${p.hookBeat}，頭微傾 1–2 度，神情自然唔擺拍。${prop}`
      : selectedPose
        ? `${selectedPose.endPoseYue}${sameFrame}`
        : fullBody
          ? `角色：畫面仍然只有呢一個人，${endVarYue.head}。${propEnd}${anchored ? `${endVarYue.hand}，重心輕輕換咗少少，腳留喺同一個位置` : endVarYue.hand}。${sameFrame}`
          : `角色：仍然係鎖骨以上自拍大特寫，${endVarYue.head}。雙手唔入鏡。${propEnd}${sameFrame}`;
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
  const lang = !isChineseScaffolding(language) ? "en" : "yue";
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
  if (scene.customSet) {
    return language === "en"
      ? `Set: the same setting in every clip (${scene.customSet}). Do not draw a bookshelf, a home sofa, a bed, or a different room. No pictures pasted on the frame, no extra writing, ${noProps}. Light: ${p.light}.`
      : `場景：全程同一個場景（${scene.customSet}），唔好再畫書架、屋企沙發、床或者其他房間。畫面上面唔好貼圖、唔好加字，${noProps}。光：${p.light}。`;
  }
  const hasNonDefaultBg = Boolean(
    scene.talkingHeadBackgroundId &&
      scene.talkingHeadBackgroundId !== DEFAULT_TALKING_HEAD_BACKGROUND_ID &&
      getTalkingHeadBackground(scene.talkingHeadBackgroundId),
  );
  if (hasNonDefaultBg) {
    return language === "en"
      ? `Set: ${p.set}. Do not draw a home sofa, a bookshelf, a bed, or a different room unless named in the Set. No pictures pasted on the frame, no extra writing, ${noProps}. Light: ${p.light}.`
      : `場景：${p.set}。除咗場景提及嘅佈置之外，唔好再畫屋企沙發、床或者其他房間。畫面上面唔好貼圖、唔好加字，${noProps}。光：${p.light}。`;
  }
  return language === "en"
    ? `Set: ${p.set}. No pictures pasted on the frame, no extra writing, ${noProps}. Light: ${p.light}.`
    : `場景：${p.set}。畫面上面唔好貼圖、唔好加字，${noProps}。光：${p.light}。`;
}

function cameraClause(language: VoLanguage | undefined, shot: string | undefined, perf: PerformanceSlots) {
  const size = shot?.trim() || "";
  const fullBody = size === "full-body";
  const anchored = hasAnchorProp(perf);
  if (!isChineseScaffolding(language)) {
    if (fullBody) return " Camera: locked full-body, character centered, head to feet in frame.";
    const inFrame = anchored
      ? "The handheld prop stays in frame."
      : "Crop ends at collarbone/upper chest.";
    if (!size) {
      return ` Camera: handheld iPhone front-camera selfie at 30–40cm, 24mm f/1.8, cropped collarbone/upper-chest up so the face fills 60–65% of vertical 9:16 (subtle 10° high-angle; no waist, lap, thighs, or hands). ${inFrame} Organic 1–2° handheld micro-sway. Do not stand up. No microphone.`;
    }
    return ` Camera: handheld ${size} selfie, character seated and centered${anchored ? ", handheld prop in frame" : ""}, organic 1–2° micro-sway.`;
  }
  if (fullBody) return "鏡頭：鎖定全身，角色置中，頭到腳都在畫面內。";
  const inFrame = anchored ? "頭同上身留喺畫面，手持道具留喺畫面" : "頭同上身留喺畫面，雙手唔入鏡";
  if (!size) {
    return `鏡頭：手持 iPhone 前置自拍 30–40cm，24mm f/1.8，由鎖骨／上胸口裁切，塊臉佔 9:16 直式畫面 60–65%（微高角度 10 度；唔好拍腰、大髀或雙手）。${inFrame}。有機手持微晃 1–2 度。唔好企起身，冇咪。`;
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

type BalanceOptions = {
  maxClipSeconds?: number;
  speechMaxSeconds?: number;
  speechTargetSeconds?: number;
};

// Clauses, then word groups, packed so each clip carries a similar amount of speech.
function balanceTalkingHeadLines(
  source: string,
  pace?: SpeechPace,
  options?: BalanceOptions,
) {
  const maxClipSeconds = options?.maxClipSeconds ?? TALKING_HEAD_MAX_SECONDS;
  const speechMaxSeconds = options?.speechMaxSeconds ?? TALKING_HEAD_MAX_SECONDS;
  const speechTargetSeconds = options?.speechTargetSeconds ?? TALKING_HEAD_MAX_SECONDS;
  const pieces = spokenPieces(source, pace, speechMaxSeconds, speechTargetSeconds);
  if (pieces.length <= 1) return pieces;
  const weights = pieces.map((piece) => rawSpokenSeconds(piece, pace));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return evenRanges(weights, total, {
    maxClipSeconds,
    speechMaxSeconds,
    speechTargetSeconds,
  }).map(([start, end]) => joinSpoken(pieces.slice(start, end)));
}

function spokenPieces(
  source: string,
  pace?: SpeechPace,
  speechMaxSeconds = SPEECH_MAX_SECONDS,
  speechTargetSeconds = SPEECH_TARGET_SECONDS,
) {
  const pieces: string[] = [];
  for (const sentence of splitTalkingHeadSentences(source)) {
    for (const clause of splitClauses(sentence)) {
      for (const piece of splitLongPiece(clause, pace, speechMaxSeconds, speechTargetSeconds)) {
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

function splitLongPiece(
  text: string,
  pace?: SpeechPace,
  speechMaxSeconds = SPEECH_MAX_SECONDS,
  speechTargetSeconds = SPEECH_TARGET_SECONDS,
) {
  const trimmed = text.trim();
  if (rawSpokenSeconds(trimmed, pace) <= speechMaxSeconds) return [trimmed];
  const atoms = speechAtoms(trimmed);
  if (atoms.length <= 1) return [trimmed];
  const parts = Math.max(2, Math.ceil(rawSpokenSeconds(trimmed, pace) / speechTargetSeconds));
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
function evenRanges(
  weights: number[],
  total: number,
  options?: BalanceOptions,
): Array<[number, number]> {
  const maxClipSeconds = options?.maxClipSeconds ?? TALKING_HEAD_MAX_SECONDS;
  const speechMaxSeconds = options?.speechMaxSeconds ?? TALKING_HEAD_MAX_SECONDS;
  const speechTargetSeconds = options?.speechTargetSeconds ?? TALKING_HEAD_MAX_SECONDS;
  if (weights.length <= 1 || total <= speechMaxSeconds) return [[0, weights.length]];
  const sliceMax = Math.min(
    maxClipSeconds,
    Math.max(speechMaxSeconds, total / TALKING_HEAD_MAX_CLIPS),
  );
  const minClips = Math.max(1, Math.ceil(total / sliceMax));
  const maxClips = Math.min(TALKING_HEAD_MAX_CLIPS, weights.length);
  const target = Math.min(speechTargetSeconds, sliceMax);
  let best: Array<[number, number]> | undefined;
  let bestCost = Number.POSITIVE_INFINITY;
  for (let groups = minClips; groups <= Math.max(minClips, maxClips); groups += 1) {
    const ranges = partitionEven(weights, groups);
    const seconds = ranges.map(([start, end]) => weightSum(weights, start, end));
    if (seconds.some((value) => value > sliceMax + 0.05)) continue;
    if (speechTargetSeconds >= maxClipSeconds) return ranges;
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
