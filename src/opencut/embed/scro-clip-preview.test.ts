import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scroClipPreviewPlan } from "@/opencut/embed/scro-clip-preview";
import type { MediaTime } from "@/opencut/wasm";

const ticks = (value: number) => value as MediaTime;
const start = ticks(400);
const duration = ticks(300);

describe("scro clip preview plan", () => {
	it("seeks to the clip start and plays when the playhead is elsewhere", () => {
		assert.deepEqual(
			scroClipPreviewPlan({
				currentTime: ticks(0),
				startTime: start,
				duration,
				shouldPlay: true,
			}),
			{ seekTo: start, play: true },
		);
	});

	it("keeps the current frame when the playhead is already inside the clip", () => {
		assert.deepEqual(
			scroClipPreviewPlan({
				currentTime: ticks(500),
				startTime: start,
				duration,
				shouldPlay: true,
			}),
			{ seekTo: null, play: true },
		);
	});

	it("seeks a placeholder still into view without starting playback", () => {
		assert.deepEqual(
			scroClipPreviewPlan({
				currentTime: ticks(900),
				startTime: start,
				duration,
				shouldPlay: false,
			}),
			{ seekTo: start, play: false },
		);
	});
});
