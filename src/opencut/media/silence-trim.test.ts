import assert from "node:assert/strict";
import { test } from "node:test";
import { detectSpeechTrimBounds } from "@/opencut/media/silence-trim";
import {
	fitFullLengthPlacements,
	storyboardPlacement,
} from "@/opencut/embed/scro-clip-duration";

function makeAudioWithSpeech({
	totalSeconds,
	speechStartSeconds,
	speechEndSeconds,
	sampleRate = 1000,
}: {
	totalSeconds: number;
	speechStartSeconds: number;
	speechEndSeconds: number;
	sampleRate?: number;
}): Float32Array {
	const totalSamples = Math.round(totalSeconds * sampleRate);
	const samples = new Float32Array(totalSamples);
	const startIdx = Math.max(0, Math.round(speechStartSeconds * sampleRate));
	const endIdx = Math.min(totalSamples, Math.round(speechEndSeconds * sampleRate));
	for (let i = startIdx; i < endIdx; i++) {
		samples[i] = 0.25 * Math.sin((2 * Math.PI * 200 * i) / sampleRate);
	}
	return samples;
}

test("detectSpeechTrimBounds trims leading and trailing dead air while keeping natural breath pads", () => {
	// 5.0s clip with speech from 0.50s to 4.10s (500ms head silence, 900ms tail silence)
	const channel = makeAudioWithSpeech({
		totalSeconds: 5.0,
		speechStartSeconds: 0.5,
		speechEndSeconds: 4.1,
	});
	const bounds = detectSpeechTrimBounds({
		channels: [channel],
		sampleRate: 1000,
		durationSeconds: 5.0,
	});
	assert.equal(bounds.speechDetected, true);
	// Expect ~0.28s trimStart (0.50 - 0.22 head pad) and ~0.55s trimEnd (5.0 - (4.10 + 0.35 tail pad))
	assert.ok(bounds.trimStartSeconds >= 0.24 && bounds.trimStartSeconds <= 0.32, `trimStart=${bounds.trimStartSeconds}`);
	assert.ok(bounds.trimEndSeconds >= 0.50 && bounds.trimEndSeconds <= 0.60, `trimEnd=${bounds.trimEndSeconds}`);
	assert.ok(
		Math.abs(bounds.visibleSeconds + bounds.trimStartSeconds + bounds.trimEndSeconds - 5.0) < 0.01,
	);
});

test("detectSpeechTrimBounds leaves silent B-roll clips untouched", () => {
	const silent = new Float32Array(5000);
	const bounds = detectSpeechTrimBounds({
		channels: [silent],
		sampleRate: 1000,
		durationSeconds: 5.0,
	});
	assert.equal(bounds.speechDetected, false);
	assert.equal(bounds.trimStartSeconds, 0);
	assert.equal(bounds.trimEndSeconds, 0);
	assert.equal(bounds.visibleSeconds, 5.0);
});

test("storyboardPlacement and fitFullLengthPlacements apply detected speech trim bounds and ripple-close gaps", () => {
	const place = storyboardPlacement({
		storyboardSeconds: 5,
		fileSeconds: 5.0,
		speechTrimStart: 0.4,
		speechTrimEnd: 0.8,
	});
	assert.equal(place.trimStartSeconds, 0.18);
	assert.equal(place.trimEndSeconds, 0.48);
	assert.equal(place.visibleSeconds, 4.34);
	assert.equal(place.sourceSeconds, 5.0);
	assert.equal(place.packAdvanceSeconds, 4.52);

	const patches = fitFullLengthPlacements({
		storyboard: [
			{ clipNumber: 1, durationSeconds: 5 },
			{ clipNumber: 2, durationSeconds: 5 },
		],
		elements: [
			{
				id: "c1",
				clipNumber: 1,
				startSeconds: 0,
				durationSeconds: 5,
				trimStartSeconds: 0,
				trimEndSeconds: 0,
				sourceSeconds: 5,
				fileSeconds: 5,
				speechTrimStart: 0.3,
				speechTrimEnd: 0.7,
			},
			{
				id: "c2",
				clipNumber: 2,
				startSeconds: 5,
				durationSeconds: 5,
				trimStartSeconds: 0,
				trimEndSeconds: 0,
				sourceSeconds: 5,
				fileSeconds: 5,
				speechTrimStart: 0.4,
				speechTrimEnd: 0.6,
			},
		],
	});

	assert.equal(patches.length, 2);
	// Clip 1 keeps extra head/tail room (0.3-0.22 / 0.7-0.32) at start=0
	assert.equal(patches[0].startSeconds, 0);
	assert.equal(patches[0].durationSeconds, 4.54);
	assert.equal(patches[0].trimStartSeconds, 0.08);
	assert.equal(patches[0].trimEndSeconds, 0.38);

	// Clip 2 starts after clip 1 plus the spoken pause gap.
	assert.equal(patches[1].startSeconds, 4.72);
	assert.equal(patches[1].durationSeconds, 4.54);
	assert.equal(patches[1].trimStartSeconds, 0.18);
	assert.equal(patches[1].trimEndSeconds, 0.28);
});
