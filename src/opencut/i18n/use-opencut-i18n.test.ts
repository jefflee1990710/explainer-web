import assert from "node:assert/strict";
import test from "node:test";
import {
	getOpencutMessages,
	localizeBilingualLabel,
} from "@/opencut/i18n/use-opencut-i18n";

test("localizeBilingualLabel returns Chinese part for zh locales and English part for en", () => {
	assert.equal(
		localizeBilingualLabel("單行撕紙黑底 · Single Torn Black", "en"),
		"Single Torn Black",
	);
	assert.equal(
		localizeBilingualLabel("單行撕紙黑底 · Single Torn Black", "zh-Hant"),
		"單行撕紙黑底",
	);
	assert.equal(
		localizeBilingualLabel("Rounded Pill · 圓角膠囊", "en"),
		"Rounded Pill",
	);
	assert.equal(
		localizeBilingualLabel("Rounded Pill · 圓角膠囊", "zh-Hant"),
		"圓角膠囊",
	);
});

test("getOpencutMessages provides localized labels across en, zh-Hant, zh-Hans, ja, and ko", () => {
	const en = getOpencutMessages("en");
	const zhHant = getOpencutMessages("zh-Hant");
	const zhHans = getOpencutMessages("zh-Hans");
	const ja = getOpencutMessages("ja");
	const ko = getOpencutMessages("ko");

	assert.equal(en.rail.onScreenText, "On-Screen Text");
	assert.equal(zhHant.rail.onScreenText, "畫面文字");
	assert.equal(zhHans.rail.onScreenText, "画面文字");
	assert.equal(ja.rail.onScreenText, "画面テキスト");
	assert.equal(ko.rail.onScreenText, "화면 텍스트");

	assert.equal(en.onScreenText.generate, "Generate Subtitle Image");
	assert.equal(zhHant.onScreenText.generate, "生成字幕圖片");

	assert.equal(en.timelineToolbar.splitElement, "Split element");
	assert.equal(zhHant.timelineToolbar.splitElement, "分割片段");
	assert.equal(en.timelineToolbar.smoothSilence, "Smooth clip silence pauses");
	assert.equal(zhHant.timelineToolbar.smoothSilence, "平滑接口停頓");
	assert.equal(en.timelineToolbar.autoSfx, "AI Auto SFX");
	assert.equal(zhHant.timelineToolbar.autoSfx, "AI 自動配聲效");
	assert.equal(en.timelineToolbar.autoBgm, "AI Auto BGM");
	assert.equal(zhHant.timelineToolbar.autoBgm, "AI 自動配背景音樂");

	for (const locale of ["en", "zh-Hant", "zh-Hans", "ja", "ko"] as const) {
		const msg = getOpencutMessages(locale);
		for (const val of Object.values(msg.timelineToolbar)) {
			if (typeof val === "string") {
				assert.equal(
					val.includes("·"),
					false,
					`Expected single-language tooltip for ${locale}, got: ${val}`,
				);
			}
		}
	}

	assert.equal(en.inspector.changeStyle, "Change Style");
	assert.equal(zhHant.inspector.changeStyle, "更換風格");
});
