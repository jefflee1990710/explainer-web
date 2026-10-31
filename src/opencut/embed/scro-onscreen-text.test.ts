import assert from "node:assert/strict";
import test from "node:test";
import {
	getScroOnscreenTexts,
	removeScroOnscreenText,
	scroOnscreenTextDisplayName,
	setScroOnscreenTexts,
	upsertScroOnscreenText,
} from "@/opencut/embed/scro-onscreen-text-store";
import { isScroSceneStill } from "@/opencut/embed/scro-video-assets";

test("ScroOnscreenText store preserves optimistic temp items until replaced by server state", () => {
	setScroOnscreenTexts({ videoId: "vid_1", items: [] });
	upsertScroOnscreenText({
		id: "temp_123",
		text: "Dopamine Level!",
		textStyleId: "clean",
		styleName: "Torn paper",
		status: "queued",
	});
	assert.equal(getScroOnscreenTexts().length, 1);

	// Server poll arrives before temp_123 is rebound: temp_123 stays visible
	setScroOnscreenTexts({
		videoId: "vid_1",
		items: [
			{
				id: "real_abc",
				text: "Earlier subtitle",
				textStyleId: "bold",
				status: "completed",
				url: "https://blob/sub.png",
			},
		],
	});
	assert.equal(getScroOnscreenTexts().length, 2);

	removeScroOnscreenText("temp_123");
	assert.equal(getScroOnscreenTexts().length, 1);
	assert.equal(getScroOnscreenTexts()[0]?.id, "real_abc");
});

test("scroOnscreenTextDisplayName formats clean label and isScroSceneStill keeps ScroOnscreenText visible in Assets", () => {
	assert.equal(
		scroOnscreenTextDisplayName("  Dopamine   Level!  "),
		"ScroOnscreenText · Dopamine Level!",
	);
	assert.equal(
		isScroSceneStill({
			asset: {
				name: "ScroOnscreenText · Dopamine Level!",
				type: "image",
				scroOnscreenTextId: "ost_1",
				scroPlaceholder: true,
			},
			clips: [],
		}),
		false,
	);
});
