import assert from "node:assert/strict";
import { test } from "node:test";
import { splitFontStack } from "@/opencut/fonts/google-fonts";
import { isScroSubtitleName, matchSubtitleSlots } from "@/opencut/embed/scro-subtitle-slots";
import {
	ARTISTIC_SUBTITLE_PRESETS,
	quoteFontFamily,
	resolveSubtitleStyleOverrides,
	splitVoIntoSubtitleSegments,
	tokenizeMixedSubtitleLine,
	wrapSubtitleTextWithMeasure,
} from "@/opencut/subtitles/artistic-presets";
import { TEXT_FONT_PRESETS } from "@/opencut/text/font-presets";

test("quoteFontFamily and splitFontStack handle bilingual Google Font stacks", () => {
	assert.deepEqual(
		splitFontStack("Anton, Dela Gothic One, Noto Sans TC"),
		["Anton", "Dela Gothic One", "Noto Sans TC"],
	);
	assert.equal(
		quoteFontFamily({ fontFamily: "Anton, Dela Gothic One, Noto Sans TC" }),
		'"Anton", "Dela Gothic One", "Noto Sans TC"',
	);
	assert.equal(
		quoteFontFamily({ fontFamily: "Noto Sans TC, sans-serif" }),
		'"Noto Sans TC", sans-serif',
	);
});

test("every artistic subtitle preset defines a bilingual Google Font stack and styling", () => {
	const lookIds = [
		"bold",
		"clean",
		"handwritten",
		"neon",
		"comic",
		"chalk",
		"gold",
		"typewriter",
		"graffiti",
		"sticker",
		"glitch",
		"brush",
		"outline",
	];
	for (const id of lookIds) {
		const preset = ARTISTIC_SUBTITLE_PRESETS[id];
		assert.ok(preset, `preset ${id} exists`);
		assert.ok(preset.defaultFontFamily.includes("Noto"), `preset ${id} includes CJK font`);
		const resolved = resolveSubtitleStyleOverrides({ lookId: id });
		assert.equal(resolved.fontFamily, preset.defaultFontFamily);
	}

	const overridden = resolveSubtitleStyleOverrides({
		lookId: "neon",
		fontFamilyOverride: "Caveat, LXGW WenKai TC, Noto Sans TC",
	});
	assert.equal(overridden.fontFamily, "Caveat, LXGW WenKai TC, Noto Sans TC");
	assert.equal(overridden.shadowColor, "#FF00A0");
	assert.ok(TEXT_FONT_PRESETS.length >= 15);
});

test("wrapSubtitleTextWithMeasure wraps Cantonese CJK and English mixed lines without spaces", () => {
	const line = "原來9成公司死喺呢個原因！Social Media就係呢一個年代嘅其中一個大方向";
	const tokens = tokenizeMixedSubtitleLine(line);
	assert.ok(tokens.includes("Social"));
	assert.ok(tokens.includes("Media"));
	assert.ok(tokens.includes("因！"));

	// Fake measure: 10px per char
	const wrapped = wrapSubtitleTextWithMeasure({
		text: line,
		maxWidth: 140,
		measure: (val) => val.length * 10,
	});
	const lines = wrapped.split("\n");
	assert.ok(lines.length >= 3, `expected >= 3 wrapped lines, got ${lines.length}`);
	for (const l of lines) {
		assert.ok(l.length <= 14, `line "${l}" exceeds 14 chars`);
	}
});

test("splitVoIntoSubtitleSegments splits multi-clause VO proportionally across clip duration", () => {
	const segments = splitVoIntoSubtitleSegments({
		line: "原來9成公司死喺呢個原因！因為無能力搵客，定位差，唔同時代都有唔同嘅方法，Social Media就係呢一個年代嘅其中一個大方向！",
		startTime: 2,
		duration: 8,
	});
	assert.ok(segments.length >= 3, `expected >= 3 segments, got ${segments.length}`);
	assert.equal(segments[0].startTime, 2);
	const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
	assert.ok(Math.abs(totalDuration - 8) < 1e-6);
	assert.doesNotMatch(segments[0].text, /[，,。]$/);
});

test("matchSubtitleSlots matches both video and still image clips and isScroSubtitleName matches segmented subtitles", () => {
	const slots = matchSubtitleSlots({
		elements: [
			{ id: "a", type: "image", name: "Clip 1", startTime: 0, duration: 500 },
			{ id: "b", type: "video", name: "Clip 2", startTime: 500, duration: 500 },
		],
		clipNumbers: [1, 2],
	});
	assert.equal(slots.get(1)?.id, "a");
	assert.equal(slots.get(2)?.id, "b");
	assert.equal(isScroSubtitleName({ name: "Subtitle 1" }), true);
	assert.equal(isScroSubtitleName({ name: "Subtitle 1-2" }), true);
	assert.equal(isScroSubtitleName({ name: "Clip 1" }), false);
});
