import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SAMPLE_PRESETS,
  sampleApplyFor,
} from "@/presentation/components/app/projects/new/sample-script-presets";

const LOCALES = ["zh-Hant", "zh-Hans", "en"] as const;

test("talking-head samples fill a different director note and spoken script", () => {
  for (const preset of SAMPLE_PRESETS) {
    for (const locale of LOCALES) {
      const applied = sampleApplyFor(preset, locale, true);
      const brief = sampleApplyFor(preset, locale, false);
      assert.ok(applied.spokenScript && applied.spokenScript.trim().length > 0);
      assert.notEqual(applied.source.trim(), applied.spokenScript.trim());
      assert.notEqual(applied.source.trim(), brief.source.trim());
      assert.equal(brief.spokenScript, undefined);
    }
  }
});
