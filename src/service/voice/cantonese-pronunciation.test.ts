import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cantonesePronunciationLock,
  withCantonesePronunciation,
} from "@/service/voice/cantonese-pronunciation";

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
