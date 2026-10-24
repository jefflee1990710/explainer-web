import assert from "node:assert/strict";
import { test } from "node:test";
import {
	computeSfxStartSeconds,
	isAiBgmElementName,
	isAiSfxElementName,
} from "@/service/opencut/auto-audio";

test("computeSfxStartSeconds places start / mid / end beats inside the clip window", () => {
	assert.equal(
		computeSfxStartSeconds({ clipStartSec: 2, clipDurSec: 4, beat: "start" }),
		2,
	);
	assert.equal(
		computeSfxStartSeconds({ clipStartSec: 2, clipDurSec: 4, beat: "mid" }),
		3.68,
	);
	assert.equal(
		computeSfxStartSeconds({ clipStartSec: 2, clipDurSec: 4, beat: "end" }),
		5.55,
	);
});

test("computeSfxStartSeconds keeps end beat from going before clip start on short clips", () => {
	assert.equal(
		computeSfxStartSeconds({ clipStartSec: 1, clipDurSec: 0.3, beat: "end" }),
		1,
	);
});

test("isAiSfxElementName / isAiBgmElementName match auto-insert prefixes", () => {
	assert.equal(isAiSfxElementName("SFX 3 · soft whoosh"), true);
	assert.equal(isAiSfxElementName("sfx hit"), true);
	assert.equal(isAiSfxElementName("B-Roll 1"), false);
	assert.equal(isAiBgmElementName("BGM · calm · Night Loop"), true);
	assert.equal(isAiBgmElementName("bgm bed"), true);
	assert.equal(isAiBgmElementName("SFX 1 · click"), false);
});
