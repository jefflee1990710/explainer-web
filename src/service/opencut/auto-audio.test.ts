import assert from "node:assert/strict";
import { test } from "node:test";
import {
	AI_BGM_DUCKED_VOLUME_DB,
	AI_BGM_VOLUME_DB,
	AI_SFX_VOLUME_DB,
	buildBgmAutoDuckingKeyframes,
	buildBgmSegmentsForTimeline,
	computeSfxStartSeconds,
	detectAudioPeakOffsetSeconds,
	isAiBgmElementName,
	isAiSfxElementName,
	mapTimelineCuesToSfxCandidates,
} from "@/service/opencut/auto-audio-shared";
import { matchIgViralSfxPreset } from "@/service/sound-effect/ig-viral-sfx";

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

test("computeSfxStartSeconds aligns acoustic peakOffsetSec to targetTimeSec or offsetRatio", () => {
	// Cut at 5.0s, whoosh peak is 0.24s into the file -> start at 4.76s
	assert.equal(
		computeSfxStartSeconds({
			clipStartSec: 0,
			clipDurSec: 5,
			beat: "end",
			targetTimeSec: 5.0,
			peakOffsetSec: 0.24,
		}),
		4.76,
	);

	// Clip at 10.0s (dur 4.0s), action at offsetRatio 0.25 (11.0s), peak at 0.15s -> start at 10.85s
	assert.equal(
		computeSfxStartSeconds({
			clipStartSec: 10,
			clipDurSec: 4,
			beat: "mid",
			offsetRatio: 0.25,
			peakOffsetSec: 0.15,
		}),
		10.85,
	);
});

test("detectAudioPeakOffsetSeconds finds the loudest RMS window offset within maxScanSeconds", () => {
	const sampleRate = 1000;
	const samples = new Float32Array(2000); // 2.0s
	// Quiet noise early, sharp peak around 0.32s..0.36s
	for (let i = 320; i < 360; i++) {
		samples[i] = 0.9;
	}
	const peakOffset = detectAudioPeakOffsetSeconds({
		samples,
		sampleRate,
	});
	assert.ok(
		peakOffset >= 0.30 && peakOffset <= 0.36,
		`Expected peak around 0.32s, got ${peakOffset}`,
	);
});

test("mapTimelineCuesToSfxCandidates generates transition & visual-pop SFX cues and deduplicates collisions", () => {
	const cues = mapTimelineCuesToSfxCandidates({
		transitions: [
			{ effectType: "wipe", cutSec: 4.5, durationSec: 0.8 },
			{ effectType: "flash", cutSec: 9.0, durationSec: 0.6 },
		],
		visualPops: [
			// Collides with wipe at 4.5s (within 0.45s) -> should be skipped in favor of transition
			{ kind: "onscreen-text", label: "重點 1", startSec: 4.6 },
			// Standalone pop at 2.1s -> kept
			{ kind: "onscreen-text", label: "Hook 標題", startSec: 2.1 },
		],
	});

	assert.equal(cues.length, 3);
	assert.equal(cues[0].targetTimeSec, 2.1);
	assert.equal(cues[0].category, "ui");
	assert.equal(cues[1].targetTimeSec, 4.5);
	assert.equal(cues[1].category, "whoosh");
	assert.equal(cues[2].targetTimeSec, 9.0);
	assert.equal(cues[2].category, "ui");
});

test("buildBgmSegmentsForTimeline loops BGM to cover full timeline duration", () => {
	const single = buildBgmSegmentsForTimeline({
		timelineDurationSec: 15,
		soundDurationSec: 25,
	});
	assert.deepEqual(single, [{ startSec: 0, durationSec: 15 }]);

	const looped = buildBgmSegmentsForTimeline({
		timelineDurationSec: 48,
		soundDurationSec: 20,
	});
	assert.deepEqual(looped, [
		{ startSec: 0, durationSec: 20 },
		{ startSec: 20, durationSec: 20 },
		{ startSec: 40, durationSec: 8 },
	]);
});

test("buildBgmAutoDuckingKeyframes ducks during speech windows, lifts in gaps, and fades out at timeline end", () => {
	const keys = buildBgmAutoDuckingKeyframes({
		segmentStartSec: 0,
		segmentDurationSec: 20,
		timelineDurationSec: 20,
		speechWindows: [
			{ startSec: 2.0, endSec: 8.0 },
			{ startSec: 10.0, endSec: 17.0 },
		],
		duckedDb: -16,
		unduckedDb: -9,
		fadeOutSec: 1.5,
	});

	assert.ok(keys.length >= 6);
	// Starts unducked during the 0..2s intro hook
	assert.equal(keys[0].timeSec, 0);
	assert.equal(keys[0].valueDb, -9);

	// Ducks to -16 dB during speech (e.g. around 2.0s)
	assert.ok(keys.some((k) => Math.abs(k.timeSec - 2.0) <= 0.3 && k.valueDb === -16));

	// Lifts back to -9 dB during the 8.0s..10.0s gap
	assert.ok(keys.some((k) => k.timeSec > 8.0 && k.timeSec < 10.0 && k.valueDb === -9));

	// Fades out at the end of the timeline (20.0s)
	const lastKey = keys[keys.length - 1];
	assert.equal(lastKey.timeSec, 20);
	assert.ok(lastKey.valueDb <= -36, `Expected fade-out <= -36 dB, got ${lastKey.valueDb}`);
});

test("auto BGM sits under speech but stays loud enough to hear", () => {
	assert.ok(AI_BGM_VOLUME_DB < 0);
	assert.ok(AI_BGM_VOLUME_DB < AI_SFX_VOLUME_DB);
	assert.equal(AI_BGM_VOLUME_DB, -16);
	assert.equal(AI_BGM_DUCKED_VOLUME_DB, -24);
});

test("matchIgViralSfxPreset maps transition, UI pop, and Foley queries to IG viral presets", () => {
	assert.equal(
		matchIgViralSfxPreset("clean swoosh transition", "whoosh")?.slug,
		"ig-whip-whoosh",
	);
	assert.equal(
		matchIgViralSfxPreset("subtle ui pop notification ding", "ui")?.slug,
		"ig-glass-ding",
	);
	assert.equal(
		matchIgViralSfxPreset("camera flash shutter click", "ui")?.slug,
		"ig-camera-shutter",
	);
	assert.equal(
		matchIgViralSfxPreset("mechanical keyboard typing", "foley")?.slug,
		"ig-keyboard-typing",
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
