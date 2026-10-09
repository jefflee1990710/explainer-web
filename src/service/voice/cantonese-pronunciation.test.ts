import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cantonesePronunciationLock,
  withCantonesePronunciation,
} from "@/service/voice/cantonese-pronunciation";
import { CANTONESE_JYUTPING } from "@/service/voice/cantonese-jyutping";

test("every Jyutping entry has one toned syllable per character, no duplicates", () => {
  const words = new Set<string>();
  for (const [word, sound] of CANTONESE_JYUTPING) {
    const syllables = sound.split(" ");
    assert.equal(syllables.length, [...word].length, word);
    for (const syllable of syllables) assert.match(syllable, /^[a-z]+[1-6]$/, word);
    assert.equal(words.has(word), false, word);
    words.add(word);
  }
});

test("Jyutping list is capped on a long line", () => {
  const line = CANTONESE_JYUTPING.map(([word]) => word).join("，");
  const listed = cantonesePronunciationLock(line).match(/ = [a-z]+\d/g) ?? [];
  assert.equal(listed.length, 12);
});

const LINE = "有無諗過你個Instagram都可以變成你嘅生財工具？我係下星期一有一個Webinar";

test("Cantonese lock lists English words and Jyutping", () => {
  const lock = cantonesePronunciationLock(LINE);
  assert.match(lock, /never Mandarin/);
  assert.match(lock, /"Webinar" = WEB-ih-nar/);
  assert.match(lock, /"Instagram" = IN-stuh-gram/);
  assert.match(lock, /生財 = saang1 coi4/);
});

test("only Cantonese prompts get the lock, and only once", () => {
  assert.equal(withCantonesePronunciation("p", "zh", LINE), "p");
  assert.equal(withCantonesePronunciation("p", "en", LINE), "p");
  const once = withCantonesePronunciation("p", "yue", LINE);
  assert.notEqual(once, "p");
  assert.equal(withCantonesePronunciation(once, "yue", LINE), once);
});
