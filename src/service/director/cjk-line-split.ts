const LATIN_WORD = String.raw`[A-Za-z0-9](?:[A-Za-z0-9'’.\-/&+@#%]*[A-Za-z0-9%])?`;
// One unbreakable unit: a Latin/number run with its inner spaces (Instagram, Scro.io, iPhone 17 Pro, 100%),
// a space run, or one character.
const TOKEN = new RegExp(String.raw`${LATIN_WORD}(?: ${LATIN_WORD})*|\s+|[\s\S]`, "gu");
const CLAUSE_END = /[，,、；;：:！？!?。]$/;
// Closing marks never open line 2.
const NO_LINE_START = /^[，,、；;：:！？!?。）)」』》〉”’.]/;

// Split a CJK line into two halves near the middle, after a clause mark when one is close,
// and never inside an English word or number.
export function splitCjkLineInTwo(raw: string): [string, string] {
  const text = raw.trim();
  const tokens = text.match(TOKEN) || [];
  const total = [...text].length;
  const mid = Math.ceil(total / 2);

  let at = 0;
  const cuts: Array<{ token: number; at: number; clause: boolean }> = [];
  tokens.forEach((token, index) => {
    if (index > 0 && !NO_LINE_START.test(token)) {
      cuts.push({ token: index, at, clause: CLAUSE_END.test(tokens[index - 1]) });
    }
    at += [...token].length;
  });
  if (cuts.length === 0) return [text, ""];

  const closest = (list: typeof cuts) =>
    list.reduce((best, cut) => {
      const gap = Math.abs(cut.at - mid);
      const bestGap = Math.abs(best.at - mid);
      return gap < bestGap || (gap === bestGap && cut.at > best.at) ? cut : best;
    });
  const clauseCuts = cuts.filter((cut) => cut.clause && Math.abs(cut.at - mid) <= 4);
  const cut = clauseCuts.length > 0 ? closest(clauseCuts) : closest(cuts);
  return [tokens.slice(0, cut.token).join("").trim(), tokens.slice(cut.token).join("").trim()];
}
