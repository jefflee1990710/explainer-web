import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scroClipPreviewPlan } from "@/opencut/embed/scro-clip-preview";
import type { MediaTime } from "@/opencut/wasm";

const ticks = (value: number) => value as MediaTime;
const start = ticks(400);
const duration = ticks(300);

describe("scro clip preview plan", () => {
	it("seeks to the clip start without auto-playing when the playhead is elsewhere", () => {
		assert.deepEqual(
			scroClipPreviewPlan({
				currentTime: ticks(0),
				startTime: start,
				duration,
				shouldPlay: true,
			}),
			{ seekTo: start, play: false },
		);
	});

	it("jumps to the clip start without auto-playing even when the playhead is inside the clip", () => {
		assert.deepEqual(
			scroClipPreviewPlan({
				currentTime: ticks(500),
				startTime: start,
				duration,
				shouldPlay: true,
			}),
			{ seekTo: start, play: false },
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
