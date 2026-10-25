import assert from "node:assert/strict";
import { test } from "node:test";
import {
	AI_BGM_VOLUME_DB,
	AI_SFX_VOLUME_DB,
	computeSfxStartSeconds,
	isAiBgmElementName,
	isAiSfxElementName,
} from "@/service/opencut/auto-audio-shared";

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

test("auto BGM sits under speech but stays loud enough to hear", () => {
	assert.ok(AI_BGM_VOLUME_DB < 0);
	assert.ok(AI_BGM_VOLUME_DB < AI_SFX_VOLUME_DB);
	assert.equal(AI_BGM_VOLUME_DB, -8);
});

test("isAiSfxElementName / isAiBgmElementName match auto-insert prefixes", () => {
	assert.equal(isAiSfxElementName("SFX 3 · soft whoosh"), true);
	assert.equal(isAiSfxElementName("sfx hit"), true);
	assert.equal(isAiSfxElementName("B-Roll 1"), false);
	assert.equal(isAiBgmElementName("BGM · calm · Night Loop"), true);
	assert.equal(isAiBgmElementName("bgm bed"), true);
	assert.equal(isAiBgmElementName("SFX 1 · click"), false);
});
