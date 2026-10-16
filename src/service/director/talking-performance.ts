import type { PerformanceSlots } from "@/model/director-performance";
import type { VoLanguage } from "@/model/project";
import { DEFAULT_PERFORMANCE } from "@/service/director/performance";
import { toWrittenChinese } from "@/service/director/written-chinese";

const TALKING_HEAD_SLUG = "talking-head-director";
const FULL_BODY_TALKING_HEAD_SLUG = "full-body-talking-head-director";

export type TalkingShot = "face" | "full-body";

export function talkingShotForSkill(skillSlug?: string): TalkingShot | undefined {
  if (skillSlug === FULL_BODY_TALKING_HEAD_SLUG) return "full-body";
  if (skillSlug === TALKING_HEAD_SLUG) return "face";
  return undefined;
}

export function clipUsesTalkingPerformance(skillSlug?: string) {
  return Boolean(talkingShotForSkill(skillSlug));
}

// A prop in the anchor hand (e.g. a handheld mic) means only the other hand gestures.
export function hasAnchorProp(perf: PerformanceSlots) {
  return Boolean(perf.anchorProp.trim());
}

function slots(shot: TalkingShot, perf?: PerformanceSlots) {
  return perf ?? DEFAULT_PERFORMANCE[shot].en;
}

// Phone-front-camera reel: look straight at the lens and stay alive.
// Expression pattern (resting face, emphasis beat) comes from the performance slots.
export function talkingFaceLock(perf: PerformanceSlots) {
  return `On-camera speech like a real person filming a vertical reel on a phone: eyes stay locked on the lens the whole time, talking to one friend, never a news-anchor statue. The mouth articulates every syllable of the spoken line with visible lip-sync and rich, expressive facial expressions (animated eyebrows, expressive eyes, lively cheek movement, and dynamic micro-expressions). Natural blinks. Resting face: ${perf.restingFace}. Emphasis: ${perf.emphasisBeat} — a resting, emphasis, resting cycle on every sentence. Between sentences a brief lip press, a sideways head tilt, or a blink marks the pause so the face never holds one shape. After the last syllable the mouth closes but the face stays engaged.`;
}

// Kept for callers that want the default face lock without a skill in hand.
export const TALKING_FACE_LOCK = talkingFaceLock(DEFAULT_PERFORMANCE.face.en);

function talkingBodyRules(shot: TalkingShot, perf: PerformanceSlots) {
  const anchored = hasAnchorProp(perf);
  const head = `Head and eyeline keep moving: ${perf.headMotion}. Mostly looking into the lens, with natural brief glances slightly aside or down at the gesturing hands when thinking or transitioning between clauses before locking eyes back onto the lens.`;
  const hands = anchored
    ? [
        `One hand holds ${perf.anchorProp} the whole time. That hand barely moves and never swaps hands. Never a greeting wave. Never a finger jab at the lens.`,
        `The other hand does all the gesturing and changes shape every 1–2 seconds in time with the words: ${perf.gestureLibrary}. It may enter and leave the frame edge between gestures. It never stays still through a whole sentence.`,
      ].join(" ")
    : `Hands keep moving at chest height and change shape every 1–2 seconds in time with the words: one hand leads, the other follows — ${perf.gestureLibrary}. A hand may enter and leave the frame edge between gestures. Never freeze both arms at the sides. Never a greeting wave. Never a finger jab at the lens.`;
  if (shot === "full-body") {
    return [
      head,
      hands,
      "Whole body keeps moving: weight shifts hip to hip, torso angles slightly left or right, a small step or lean forward on a key point, one knee soft. Feet stay in frame. Not marching, not standing at attention.",
    ].join(" ");
  }
  return [
    "The character stays seated, shifting seated weight and posture naturally across beats.",
    hands,
    head,
    "Upper body and sitting position keep moving: leaning forward toward the lens on a key point, settling back into the sofa cushion, or shifting torso weight slightly left or right on the seat. Do not freeze the neck, head angle, or shoulders in one spot. Do not stand up.",
  ].join(" ");
}

export function talkingVideoMotionRules(shot: TalkingShot, perf?: PerformanceSlots) {
  const p = slots(shot, perf);
  return [
    "This clip is on-camera speech, like a real person recording a reel, not a snap action and not a frozen pose.",
    talkingFaceLock(p),
    talkingBodyRules(shot, p),
    "Do not write snaps, flicks, whips, or pops for the face or body. Speech is conversational and sustained through the line. Camera locked.",
  ].join(" ");
}

// Old plans quote the previous subtitle ("changes from A to B"), so the model speaks A again.
export function speakOnlyThisClip(motion: string, line: string, language?: VoLanguage) {
  const spoken = line.trim();
  if (!spoken || !/換成「|changes from "/.test(motion)) return motion;
  const belowCenter = /中線下面|below the vertical center/.test(motion);
  const body = motion
    .replace(/\s*(?:中線下面少少嘅字幕|底部字幕)由「[^」]*」換成「[^」]*」。/g, "")
    .replace(/\s*Subtitle [^.]*changes from "[^"]*" to "[^"]*"\./g, "")
    .trim();
  return `${body} ${thisClipOnlySubtitle({ language, line: spoken, belowCenter })}`.replace(/\s{2,}/g, " ");
}

function thisClipOnlySubtitle(input: { language?: VoLanguage; line: string; belowCenter: boolean }) {
  if (input.language === "en" || !input.language) {
    const place = input.belowCenter ? "a little below the vertical center" : "at the bottom";
    return `Subtitle stays ${place}, this clip's line only: "${input.line}". If the opening frame still shows other words, replace them at once and do not read them. The voice says this line once and no earlier sentence.`;
  }
  const painted = toWrittenChinese(input.line);
  const place = input.belowCenter ? "中線下面少少嘅字幕" : "底部字幕";
  return `${place}全程只係呢句「${painted}」。如果開頭畫面仲係上一段嘅字，即刻改成呢句，唔好讀出舊字。把聲只講呢句一次，唔好再講上一段。`;
}

function speakEnd(seconds: number) {
  return Math.max(seconds - 0.8, Math.round(seconds * 0.7 * 10) / 10);
}

function leadHand(clipNumber?: number) {
  return (clipNumber ?? 1) % 2 === 1 ? "right" : "left";
}

function clipHeadMotionEn(clipNumber: number | undefined, baseHeadMotion: string) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  const beats = [
    `leaning forward slightly on the seat, tilting the head to the left and nodding on the stressed words (${baseHeadMotion})`,
    `glancing briefly off to the upper-right in thought for half a second before turning the head back to lock eyes on the lens, shifting seated weight slightly to the right (${baseHeadMotion})`,
    `settling back into the sofa cushion with a relaxed shoulder shrug, head tilting noticeably to the right as both hands open (${baseHeadMotion})`,
    `angling the torso into a three-quarter posture, glancing down briefly at the gesturing hands before lifting the chin and smiling back at the lens (${baseHeadMotion})`,
    `shifting seated position slightly to the left side of the cushion, turning the head 15 degrees left with a lively brow lift then nodding toward the lens (${baseHeadMotion})`,
    `leaning in closer toward the camera as if confiding in a friend, head upright with a warm nod and expressive eyes (${baseHeadMotion})`,
  ];
  return beats[variant];
}

function clipCloseLandingEn(
  clipNumber: number | undefined,
  last: boolean,
  ctaBeat: string,
  anchored: boolean,
  hand: string,
  other: string,
  anchorProp: string,
) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  const closeFaces = [
    "the mouth closes into a small real smile, eyebrows relaxed, head tilted noticeably to the left while leaning slightly forward on the seat, eyes on the lens",
    "the mouth closes into a thoughtful half-smile, head turned about 15 degrees to the right with eyes glancing briefly off-camera to the side in thought",
    "the mouth closes into an engaged warm smile, torso settled back into the sofa with shoulders relaxed and head tilted to the right, eyes on the lens",
    "the mouth closes into a lively knowing smile, torso angled slightly three-quarter with chin lifted and head turned slightly left, eyes glancing down toward the hands",
    "the mouth closes into a confident smile, eyebrows softly lifted, seated weight shifted slightly to the left with head upright and leaning in toward the lens",
    "the mouth closes into a warm conversational smile, head tilted to the left with a soft nod, eyes locked on the lens",
  ];
  const closeFace = last ? `the mouth closes into ${ctaBeat}` : closeFaces[variant];
  if (anchored) {
    const anchoredHands = [
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand eases open-palm at chest height, the body stays in the frame`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand touches lightly near the chin in a thinking gesture, the body shifted slightly right on the seat`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand settles at chest height with fingers spread in a shrug, torso settled back`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand holds a light index-finger gesture at chest height, torso angled slightly`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand counts two fingers at chest height, seated weight shifted slightly left`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand rests lightly against the chest, leaning slightly toward the lens`,
    ];
    return { closeFace, closeBeat: anchoredHands[variant] };
  }
  const unanchoredHands = [
    `the ${other} hand settles open-palm at chest height while the ${hand} hand rests on the lap, leaning slightly forward`,
    `the ${hand} hand rises lightly near the chin in a thoughtful pose while the ${other} hand lowers to the lap, torso shifted slightly right on the sofa`,
    `both hands open wide at chest height in a relaxed two-handed shrug while the torso leans back into the sofa cushion`,
    `the ${other} hand gestures at chest height while the ${hand} hand rests near the waist, torso angled slightly three-quarter`,
    `the ${hand} hand holds up two fingers at chest height in a counting gesture while the ${other} hand rests on the lap, seated weight shifted slightly left`,
    `one hand rests lightly against mid-chest while the other hand offers an open palm toward the lens, leaning in closer`,
  ];
  return { closeFace, closeBeat: unanchoredHands[variant] };
}

function clipHeadMotionYue(clipNumber: number | undefined, baseHeadMotion: string) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  const beats = [
    `坐姿微微前傾、頭向左明顯微傾同喺重音位點頭（${baseHeadMotion}）`,
    `眼神自然望一望右上側邊思考半秒再轉返頭直望鏡頭，坐姿重心微微移去沙發右邊（${baseHeadMotion}）`,
    `上身放鬆靠返後沙發背、聳一聳肩，頭向右邊傾斜、雙手自然攤開（${baseHeadMotion}）`,
    `上身微轉成三七面角度，低頭望一望比畫緊嘅雙手再抬起下巴對鏡頭微笑（${baseHeadMotion}）`,
    `坐姿重心微移去沙發左邊，頭向左轉約 15 度挑眉再向鏡頭點頭（${baseHeadMotion}）`,
    `上身明顯向前傾靠近鏡頭好似同朋友講秘密，頭擺正溫柔點頭（${baseHeadMotion}）`,
  ];
  return beats[variant];
}

function clipCloseLandingYue(
  clipNumber: number | undefined,
  last: boolean,
  ctaBeat: string,
  anchored: boolean,
  zhHand: string,
  zhOther: string,
  anchorProp: string,
) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  const closeFaces = [
    "口部合上變成自然淺笑，眉毛放鬆，上身微微前傾、頭明顯向左邊傾幾度，望住鏡頭",
    "口部合上帶住思考嘅淺笑，頭向右轉約 15 度、眼神自然望向畫面側邊思考緊",
    "口部合上變成有神嘅淺笑，上身放鬆靠返沙發背、頭向右邊傾斜，望住鏡頭",
    "口部合上變成親切笑容，上身微側成三七面、下巴微抬，眼神望一望手勢",
    "口部合上帶住自信微笑，坐姿重心微移去左邊、頭擺正微微前傾望住鏡頭",
    "口部合上變成溫柔淺笑，頭向左微傾點頭，直望鏡頭",
  ];
  const closeFace = last ? `口部合上變成${ctaBeat}` : closeFaces[variant];
  if (anchored) {
    return {
      closeFace,
      closeBeat: `${anchorProp}仍然喺${zhHand}，${zhOther}停喺胸前，身體留喺畫面入面`,
    };
  }
  const unanchoredHands = [
    `${zhOther}掌心打開停喺胸前、${zhHand}自然放喺大髀，上身微微前傾`,
    `${zhHand}輕輕舉到下巴旁邊做思考手勢、${zhOther}放返落大髀，坐姿微移去右邊`,
    `兩隻手喺胸前自然攤開聳肩，上身放鬆靠後沙發背`,
    `${zhOther}喺胸前做手勢、${zhHand}放低，上身微側成三七面`,
    `${zhHand}喺胸前豎起兩隻手指數數、${zhOther}放喺大髀，坐姿重心微移去左邊`,
    `一隻手輕撫心口、另一隻手掌心向鏡頭遞出，上身向前傾近鏡頭`,
  ];
  return { closeFace, closeBeat: unanchoredHands[variant] };
}
function anchorSide() {
  return "right" as const;
}

export function talkingMotionLine(input: {
  language?: VoLanguage;
  seconds: number;
  line: string;
  previousLine?: string;
  shot: TalkingShot;
  clipNumber?: number;
  // Total planned clips. The last clip ends on the CTA beat.
  totalClips?: number;
  belowCenter?: boolean;
  // Resolved slots in the prompt language. Defaults to the shot's English set.
  performance?: PerformanceSlots;
  // True when a later pass burns the subtitle on. Motion keeps the spoken line and skips caption fades.
  overlay?: boolean;
  // Brief chose None. Do not mention an on-screen subtitle at all.
  noText?: boolean;
  // Next clip's spoken line. Talking-head overlay ends on this subtitle.
  nextLine?: string;
}) {
  const close = speakEnd(input.seconds);
  const pEn = input.performance ?? DEFAULT_PERFORMANCE[input.shot].en;
  const anchoredEn = hasAnchorProp(pEn);
  // Unanchored clips still alternate which hand leads. The mic hand stays put.
  const hand = anchoredEn ? anchorSide() : leadHand(input.clipNumber);
  const other = hand === "right" ? "left" : "right";
  // Clip 1 opens on the hook beat; the last clip closes on the CTA beat.
  const first = (input.clipNumber ?? 1) === 1;
  const last = Boolean(input.totalClips && input.clipNumber === input.totalClips);
  const seated = input.shot !== "full-body";
  if (input.language === "en" || !input.language) {
    const p = pEn;
    const anchored = anchoredEn;
    const place = input.belowCenter ? "a little below the vertical center" : "at the bottom";
    // Quoting the previous line makes the model speak it again.
    const subtitle = input.previousLine
      ? thisClipOnlySubtitle({ language: "en", line: input.line, belowCenter: Boolean(input.belowCenter) })
      : `The large subtitle holds ${place}: "${input.line}".`;
    const face = `a live ${seated ? "real-person" : "reel-person"} face — ${p.restingFace}, and ${p.emphasisBeat}`;
    const head = `head tilting and nodding on the stresses — ${clipHeadMotionEn(input.clipNumber, p.headMotion)}`;
    const hands = anchored
      ? `the ${hand} hand holding ${p.anchorProp} as a fixed anchor while the ${other} hand does all the gesturing at chest height and changes shape every 1–2 seconds in time with the words (${p.gestureLibrary})`
      : `the ${hand} then ${other} hand gesturing at chest height and changing shape every 1–2 seconds in time with the words (${p.gestureLibrary})`;
    const body = seated
      ? `speaks "${input.line}" with continuous lip-sync, ${face}, seated the whole time, ${head}, ${hands}`
      : `speaks "${input.line}" with continuous lip-sync, ${face}, ${head}, ${hands}, and weight shifting hip to hip; feet stay in frame`;
    const hook = first ? `${p.hookBeat} as the hook` : "eyebrows lifting into a warm half-smile";
    const propReady = anchored ? `, the ${hand} hand already holding ${p.anchorProp}` : "";
    const hideSubtitle = input.overlay || input.noText;
    const fadeIn = `the large subtitle fades and slides up into place ${place}`;
    const fadeInClause = hideSubtitle ? "" : `, ${fadeIn}`;
    const open = !first
      ? `0–0.4s she stays in the exact framing of the first frame, ${seated ? "seated, " : ""}same crop, same distance, eyes locked on the lens, ${hook}${propReady}, mouth opening into this line${fadeInClause}, no cut and no jump`
      : seated
        ? `0–0.4s she inhales, blinks once, seated, eyes locked on the lens, ${hook}${propReady}, the ${other} hand already rising to chest height, mouth opening${fadeInClause}`
        : `0–0.4s she inhales, blinks once, eyes locked on the lens as if talking into a phone, ${hook}${propReady}, head already tilting, one hand already rising, mouth opening${fadeInClause}`;
    const { closeFace, closeBeat } = clipCloseLandingEn(
      input.clipNumber,
      last,
      p.ctaBeat,
      anchored,
      hand,
      other,
      p.anchorProp,
    );
    const fadeOut = `the large subtitle fades and slides down out`;
    const cameraTail = seated
      ? "camera stays locked on the phone tripod, 24mm at f/1.8, from the first frame to the last frame, no zoom, no reframe, no jump."
      : "camera stays locked on the same framing from the first frame to the last frame, no zoom, no reframe, no jump.";
    const hold = hideSubtitle ? "" : ", and the large subtitle holds still";
    const fadeOutClause = hideSubtitle ? "" : `, ${fadeOut}`;
    const subtitleTail = hideSubtitle ? "" : ` ${subtitle}`;
    const transition = input.noText ? "" : overlaySubtitleTransition("en", input);
    return `${open}; 0.4–${close}s she ${body}${hold}; ${close}–${input.seconds}s ${closeFace}, ${closeBeat}${fadeOutClause}${transition}; ${cameraTail}${subtitleTail}`;
  }
  const p = input.performance ?? DEFAULT_PERFORMANCE[input.shot].yue;
  const anchored = hasAnchorProp(p);
  const painted = toWrittenChinese(input.line);
  const place = input.belowCenter ? "中線下面少少嘅字幕" : "底部字幕";
  // 唔好引用上一段。引用會令模型再唸一次。
  const subtitle = input.previousLine
    ? thisClipOnlySubtitle({ language: input.language, line: input.line, belowCenter: Boolean(input.belowCenter) })
    : `大字幕保持${place}「${painted}」。`;
  const zhHand = hand === "right" ? "右手" : "左手";
  const zhOther = hand === "right" ? "左手" : "右手";
  const face = `神情似真人${seated ? "喺屋企拍手機片" : "拍 Reel"}，${p.restingFace}，${p.emphasisBeat}`;
  const head = `頭部左右傾同重音位點頭，${clipHeadMotionYue(input.clipNumber, p.headMotion)}`;
  const hands = anchored
    ? `${zhHand}拎住${p.anchorProp}作為固定錨點幾乎唔郁，${zhOther}負責晒所有手勢喺胸前比畫，每 1–2 秒換一個手勢跟住說話節奏（${p.gestureLibrary}）`
    : `${zhHand}再${zhOther}喺胸前比畫，每 1–2 秒換一個手勢跟住說話節奏（${p.gestureLibrary}）`;
  const body = seated
    ? `坐住唔起身，口型跟住講「${input.line}」，${face}，${head}，${hands}`
    : `口型跟住講「${input.line}」，${face}，${head}，${hands}，重心左右移；頭到腳留喺畫面`;
  const hook = first ? `${p.hookBeat}做 hook` : "眉毛揚起、帶住半笑";
  const propReady = anchored ? `、${p.anchorProp}已經喺${zhHand}` : "";
  const hideSubtitle = input.overlay || input.noText;
  const fadeIn = `大字幕由下向上淡入到${place}`;
  const fadeInClause = hideSubtitle ? "" : `、${fadeIn}`;
  const open = !first
    ? `0–0.4s 保持第一幀嘅構圖，${seated ? "坐住、" : ""}同一個裁切、同一距離、直望鏡頭、${hook}${propReady}、開口講呢句${fadeInClause}、冇切鏡、冇跳鏡`
    : seated
      ? `0–0.4s 坐住、吸一口氣、眨眼、直望鏡頭、${hook}${propReady}、${zhOther}已經提到胸前、準備開口${fadeInClause}`
      : `0–0.4s 吸一口氣、眨眼、直望鏡頭好似對住手機講、${hook}${propReady}、頭已經微傾、一隻手已經提起、準備開口${fadeInClause}`;
  const { closeFace, closeBeat } = clipCloseLandingYue(
    input.clipNumber,
    last,
    p.ctaBeat,
    anchored,
    zhHand,
    zhOther,
    p.anchorProp,
  );
  const cameraTail = seated
    ? "鏡頭由第一幀到最後一幀鎖喺手機腳架，24mm f/1.8，唔好變焦、唔好換鏡、唔好跳鏡。"
    : "鏡頭由第一幀到最後一幀鎖定同一構圖，唔好變焦、唔好換鏡、唔好跳鏡。";
  const hold = hideSubtitle ? "" : "，大字幕保持唔郁";
  const fadeOutClause = hideSubtitle ? "" : "，大字幕向下淡出";
  const subtitleTail = hideSubtitle ? "" : subtitle;
  const transition = input.noText ? "" : overlaySubtitleTransition("yue", input);
  return `${open}；0.4–${close}s ${body}${hold}；${close}–${input.seconds}s ${closeFace}，${closeBeat}${fadeOutClause}${transition}；${cameraTail}${subtitleTail}`;
}

// Talking-head overlay: the end still already shows the next line, so the
// motion has to move the subtitle there. The voice still says only this line.
// Full-body overlay keeps one subtitle for the whole clip.
function overlaySubtitleTransition(
  language: "en" | "yue",
  input: { overlay?: boolean; shot: TalkingShot; line: string; nextLine?: string },
) {
  if (!input.overlay || input.shot === "full-body") return "";
  const next = input.nextLine?.trim();
  if (language === "en") {
    if (!next) return `, and the on-screen subtitle holds "${input.line}" through the last frame`;
    return `, and the on-screen subtitle starts as "${input.line}" and in the last moment slides and fades into the next subtitle "${next}", so the last frame shows only that next line. The voice says "${input.line}" once and does not speak the next subtitle`;
  }
  const painted = toWrittenChinese(input.line);
  if (!next) return `。畫面字幕一直係「${painted}」，去到最後一幀都係`;
  const nextPainted = toWrittenChinese(next);
  return `。畫面字幕由「${painted}」喺最後一刻滑動淡入下一段字幕「${nextPainted}」，最後一幀只係下一段嗰句。把聲只講「${input.line}」一次，唔好講下一段字幕`;
}
