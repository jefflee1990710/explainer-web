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
});
