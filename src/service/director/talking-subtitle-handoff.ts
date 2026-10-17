import type { VoLanguage } from "@/model/project";
import { toWrittenChinese } from "@/service/director/written-chinese";

const LETTERING_LOCK_EN =
  "Subtitle lettering: keep exactly the lettering already painted on the first and last frames — same font, colors, paper strips, size, and place. Never redraw it as a plain white caption and never fade it away.";
const LETTERING_LOCK_YUE =
  "字幕字款：全程保持第一幀同最後一幀已經畫好嘅字幕樣式（字體、顏色、紙條、大小、位置），唔好改成普通白色字幕，亦唔好淡出。";

// Talking-head video send: both keyframes already carry painted subtitles.
// The motion must not fade them in or out (the model redraws them as a plain
// caption). A clip that lands on the next clip's start swaps to that line at the end.
export function withTalkingSubtitleHandoff(
  prompt: string,
  input: { line: string; nextLine?: string; language?: VoLanguage },
) {
  if (/No letters, subtitles, captions/i.test(prompt)) return prompt;
  if (prompt.includes(LETTERING_LOCK_EN) || prompt.includes(LETTERING_LOCK_YUE)) return prompt;
  const next = input.nextLine?.trim();
  if (input.language === "yue") {
    const handedOff = /滑動淡入下一段字幕/.test(prompt);
    const landing = next && !handedOff
      ? `，最後一刻字幕滑動淡入下一段字幕「${toWrittenChinese(next)}」，最後一幀只係下一段嗰句`
      : handedOff
        ? ""
        : "，大字幕保持唔郁";
    const body = prompt
      .replace(/大字幕由下向上淡入到/g, "大字幕已經喺")
      .replace(/，大字幕向下淡出/g, landing);
    const voice = next ? `把聲只講「${input.line.trim()}」一次，唔好講下一段字幕。` : "";
    return `${body.trim()}\n\n${LETTERING_LOCK_YUE}${voice}`;
  }
  const handedOff = /slides and fades into the next subtitle/.test(prompt);
  const landing = next && !handedOff
    ? `, and in the last moment the subtitle slides and fades into the next subtitle "${next}", so the last frame shows only that next line`
    : handedOff
      ? ""
      : ", and the large subtitle holds";
  let body = prompt
    .replace(/the large subtitle fades and slides up into place /g, "the large subtitle already sits in place ")
    .replace(/, the large subtitle fades and slides down out/g, landing);
  if (next) {
    body = body.replace(
      /Same words, same place, from the first frame to the last\./g,
      "Same place from the first frame to the last; the words change to the next clip's line only in the last moment.",
    );
  }
  const voice = next
    ? ` The voice says "${input.line.trim()}" once and never speaks the next subtitle.`
    : "";
  return `${body.trim()}\n\n${LETTERING_LOCK_EN}${voice}`;
}
