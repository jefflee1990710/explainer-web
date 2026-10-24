import assert from "node:assert/strict";
import test from "node:test";
import {
	SMOOTH_SILENCE_GAP_SECONDS,
	naturalSpeechTrim,
	nextPackedStartSeconds,
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
