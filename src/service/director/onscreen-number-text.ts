const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

const CN_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const CN_SMALL: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
const CN_BIG: Record<string, number> = { 萬: 10_000, 億: 100_000_000, 亿: 100_000_000 };
const CN_NUMBER = /[零〇一二兩三四五六七八九十百千萬亿億]+/g;

type Piece = { text: string; word: boolean };

function tokenize(text: string): Piece[] {
  return text.match(/[A-Za-z0-9]+|[^A-Za-z0-9]+/g)?.map((part) => ({
    text: part,
    word: /^[A-Za-z0-9]+$/.test(part),
  })) ?? [];
}

function isJoiner(piece: Piece | undefined): boolean {
  return Boolean(piece && !piece.word && /^[\s-]+$/.test(piece.text));
}

function wordAt(pieces: Piece[], index: number): { index: number; word: string } | null {
  let cursor = index;
  while (isJoiner(pieces[cursor])) cursor += 1;
  const piece = pieces[cursor];
  if (!piece?.word) return null;
  return { index: cursor, word: piece.text.toLowerCase() };
}

function formatCount(value: number, fraction: string): string {
  if (!fraction) return String(value);
  return `${value}.${fraction}`;
}

// Read one English quantity starting at `index`. "Ninety percent" becomes "90%".
function readEnglishQuantity(
  pieces: Piece[],
  index: number,
): { next: number; text: string } | null {
  let total = 0;
  let current = 0;
  let fraction = "";
  let saw = false;
  let sawScale = false;
  let digitLocked = false;
  let cursor = index;

  while (cursor < pieces.length) {
    const next = wordAt(pieces, cursor);
    if (!next) break;
    const word = next.word;

    if (word === "and") {
      if (!saw || !sawScale || digitLocked) break;
      cursor = next.index + 1;
      continue;
    }

    if (word === "a") {
      const scale = wordAt(pieces, next.index + 1);
      if (saw || !scale || !SCALES[scale.word]) break;
      cursor = next.index + 1;
      continue;
    }

    if (word === "point") {
      if (!saw || fraction) break;
      const digits = readFraction(pieces, next.index + 1);
      if (!digits) break;
      fraction = digits.text;
      cursor = digits.next;
      continue;
    }

    if (/^\d+(?:\.\d+)?$/.test(word)) {
      if (saw) break;
      const parsed = Number(word);
      if (!Number.isFinite(parsed)) break;
      const dot = word.indexOf(".");
      current = dot === -1 ? parsed : Math.trunc(parsed);
      fraction = dot === -1 ? "" : word.slice(dot + 1);
      saw = true;
      digitLocked = true;
      cursor = next.index + 1;
      continue;
    }

    if (digitLocked) break;

    if (Object.prototype.hasOwnProperty.call(ONES, word)) {
      if (current % 10 !== 0) break;
      current += ONES[word];
      saw = true;
      cursor = next.index + 1;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(TEENS, word)) {
      if (current % 100 !== 0) break;
      current += TEENS[word];
      saw = true;
      cursor = next.index + 1;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(TENS, word)) {
      if (current % 100 !== 0) break;
      current += TENS[word];
      saw = true;
      cursor = next.index + 1;
      continue;
    }
    if (SCALES[word]) {
      const scale = SCALES[word];
      if (scale === 100) current = (current || 1) * 100;
      else {
        total += (current || 1) * scale;
        current = 0;
      }
      saw = true;
      sawScale = true;
      cursor = next.index + 1;
      continue;
    }

    break;
  }

  if (!saw) return null;

  const percent = readPercent(pieces, cursor);
  const value = total + current;
  if (percent) {
    return { next: percent.next, text: `${formatCount(value, fraction)}%` };
  }
  return { next: cursor, text: formatCount(value, fraction) };
}

function readFraction(
  pieces: Piece[],
  index: number,
): { text: string; next: number } | null {
  let digits = "";
  let cursor = index;
  while (cursor < pieces.length) {
    const next = wordAt(pieces, cursor);
    if (!next) break;
    if (Object.prototype.hasOwnProperty.call(ONES, next.word)) {
      digits += String(ONES[next.word]);
      cursor = next.index + 1;
      continue;
    }
    if (/^\d$/.test(next.word)) {
      digits += next.word;
      cursor = next.index + 1;
      continue;
    }
    break;
  }
  if (!digits) return null;
  return { text: digits, next: cursor };
}

function readPercent(
  pieces: Piece[],
  index: number,
): { next: number } | null {
  const next = wordAt(pieces, index);
  if (!next) return null;
  if (next.word === "percent") return { next: next.index + 1 };
  if (next.word !== "per") return null;
  const cent = wordAt(pieces, next.index + 1);
  if (!cent || cent.word !== "cent") return null;
  return { next: cent.index + 1 };
}

function replaceEnglishNumbers(text: string): string {
  const pieces = tokenize(text.replace(/\b(\d{1,3})(?:,(\d{3}))+\b/g, (match) => match.replace(/,/g, "")));
  let out = "";
  for (let index = 0; index < pieces.length; ) {
    const piece = pieces[index];
    if (!piece.word) {
      out += piece.text;
      index += 1;
      continue;
    }
    const quantity = readEnglishQuantity(pieces, index);
    if (!quantity || quantity.next === index) {
      out += piece.text;
      index += 1;
      continue;
    }
    out += quantity.text;
    index = quantity.next;
  }
  return out;
}

function parseChineseNumber(raw: string): number | null {
  if (!raw || ![...raw].every((char) => CN_DIGITS[char] != null || CN_SMALL[char] || CN_BIG[char])) {
    return null;
  }
  let result = 0;
  let section = 0;
  let number = 0;
  let saw = false;
  for (const char of raw) {
    if (CN_DIGITS[char] != null) {
      number = CN_DIGITS[char];
      saw = true;
      continue;
    }
    if (CN_SMALL[char]) {
      section += (number || 1) * CN_SMALL[char];
      number = 0;
      saw = true;
      continue;
    }
    if (CN_BIG[char]) {
      section += number;
      result += (section || 1) * CN_BIG[char];
      section = 0;
      number = 0;
      saw = true;
    }
  }
  if (!saw) return null;
  return result + section + number;
}

function replaceChineseNumbers(text: string): string {
  const withPercent = text.replace(/百分之([零〇一二兩三四五六七八九十百千萬亿億]+)/g, (match, raw: string) => {
    const value = parseChineseNumber(raw);
    return value == null ? match : `${value}%`;
  });
  return withPercent.replace(CN_NUMBER, (raw) => {
    if (![...raw].some((char) => CN_SMALL[char] || CN_BIG[char])) return raw;
    const value = parseChineseNumber(raw);
    return value == null ? raw : String(value);
  });
}

// Painted on-screen lettering uses digits. Spoken words stay in the voiceover.
export function displayNumbersForOnScreenText(text: string): string {
  return replaceEnglishNumbers(replaceChineseNumbers(text));
}
