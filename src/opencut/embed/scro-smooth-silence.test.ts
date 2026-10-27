import assert from "node:assert/strict";
import test from "node:test";
import {
	SMOOTH_SILENCE_GAP_SECONDS,
	getScroSmoothSilenceEnabled,
	naturalSpeechTrim,
	nextPackedStartSeconds,
	setScroSmoothSilenceEnabled,
	shouldAutoEnableSmoothSilence,
	syncAutoSmoothSilence,
} from "@/opencut/embed/scro-smooth-silence-pack";

test("naturalSpeechTrim keeps extra head/tail room so cuts do not land on the first phoneme", () => {
	const trimmed = naturalSpeechTrim({
		duration: 5,
		trimStart: 0.43,
		trimEnd: 0.79,
	});
	assert.ok(trimmed.trimStart >= 0.18 && trimmed.trimStart <= 0.24, `trimStart=${trimmed.trimStart}`);
	assert.ok(trimmed.trimEnd >= 0.44 && trimmed.trimEnd <= 0.5, `trimEnd=${trimmed.trimEnd}`);
	assert.ok(trimmed.visible > 4.2, `visible=${trimmed.visible}`);
	assert.ok(
		Math.abs(trimmed.visible + trimmed.trimStart + trimmed.trimEnd - 5) < 0.02,
	);
});

test("nextPackedStartSeconds leaves a spoken pause between clips and none after the last", () => {
	const secondStart = nextPackedStartSeconds(0, 4.3, false);
	assert.equal(secondStart, 4.3 + SMOOTH_SILENCE_GAP_SECONDS);
	assert.equal(nextPackedStartSeconds(secondStart, 4.1, true), secondStart + 4.1);
});

test("shouldAutoEnableSmoothSilence turns on for talking-head after video generation and respects user override", () => {
	assert.equal(
		shouldAutoEnableSmoothSilence({ isTalkingHead: true, hasGeneratedVideo: false }),
		false,
	);
	assert.equal(
		shouldAutoEnableSmoothSilence({ isTalkingHead: true, hasGeneratedVideo: true }),
		true,
	);
	assert.equal(
		shouldAutoEnableSmoothSilence({ isTalkingHead: false, hasGeneratedVideo: true }),
		false,
	);
	assert.equal(
		shouldAutoEnableSmoothSilence({
			isTalkingHead: true,
			hasGeneratedVideo: true,
			userOverride: false,
		}),
		false,
	);
	assert.equal(
		shouldAutoEnableSmoothSilence({
			isTalkingHead: false,
			hasGeneratedVideo: false,
			userOverride: true,
		}),
		true,
	);
});

test("syncAutoSmoothSilence auto-enables for talking-head video and preserves user toggle state", () => {
	syncAutoSmoothSilence({
		videoId: "vid-talking-1",
		isTalkingHead: true,
		hasGeneratedVideo: false,
	});
	assert.equal(getScroSmoothSilenceEnabled(), false);

	// Once video is generated for a talking-head project, Smooth Silence turns ON automatically.
	syncAutoSmoothSilence({
		videoId: "vid-talking-1",
		isTalkingHead: true,
		hasGeneratedVideo: true,
	});
	assert.equal(getScroSmoothSilenceEnabled(), true);

	// User manually toggles Smooth Silence OFF; subsequent auto-sync respects user choice.
	setScroSmoothSilenceEnabled(false, {
		videoId: "vid-talking-1",
		userInitiated: true,
	});
	assert.equal(getScroSmoothSilenceEnabled(), false);
	syncAutoSmoothSilence({
		videoId: "vid-talking-1",
		isTalkingHead: true,
		hasGeneratedVideo: true,
	});
	assert.equal(getScroSmoothSilenceEnabled(), false);
});

