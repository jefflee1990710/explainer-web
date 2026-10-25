import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	PREVIEW_EMPTY_HOLD_MS,
	previewClipHandoff,
	previewLoadDecision,
	previewSampleRects,
	rgbaRegionIsPainted,
} from "@/opencut/preview/preview-frame-ready";

describe("previewSampleRects", () => {
	it("probes a 3x3 grid, not only the center", () => {
		const rects = previewSampleRects(1440, 2560);
		assert.equal(rects.length, 9);
		const center = rects.find((rect) => rect.x === 716 && rect.y === 1276);
		assert.ok(center);
		assert.ok(rects.some((rect) => rect.x !== center.x || rect.y !== center.y));
		for (const rect of rects) {
			assert.ok(rect.x >= 0 && rect.y >= 0);
			assert.ok(rect.x + rect.size <= 1440);
			assert.ok(rect.y + rect.size <= 2560);
		}
	});
});

describe("rgbaRegionIsPainted", () => {
	it("treats a near-black block as unpainted", () => {
		assert.equal(rgbaRegionIsPainted(new Uint8ClampedArray(8 * 8 * 4)), false);
	});

	it("treats one bright channel as painted", () => {
		const data = new Uint8ClampedArray(8 * 8 * 4);
		data[1] = 17;
		assert.equal(rgbaRegionIsPainted(data), true);
	});
});

describe("previewLoadDecision", () => {
	it("hides the spinner and remembers the first painted frame", () => {
		assert.deepEqual(previewLoadDecision({ seenFrame: false, painted: true, emptyForMs: 0 }), {
			seenFrame: true,
			showLoading: false,
			retry: false,
		});
	});

	it("keeps the spinner only while the first frame is still blank", () => {
		assert.deepEqual(previewLoadDecision({ seenFrame: false, painted: false, emptyForMs: 200 }), {
			seenFrame: false,
			showLoading: true,
			retry: true,
		});
	});

	it("drops the spinner after the blank hold even if nothing painted", () => {
		assert.deepEqual(
			previewLoadDecision({
				seenFrame: false,
				painted: false,
				emptyForMs: PREVIEW_EMPTY_HOLD_MS,
			}),
			{ seenFrame: false, showLoading: false, retry: false },
		);
	});

	it("does not cover a later black frame once a real frame has painted", () => {
		assert.deepEqual(
			previewLoadDecision({ seenFrame: true, painted: false, emptyForMs: 0 }),
			{ seenFrame: true, showLoading: false, retry: false },
		);
	});
});

describe("previewClipHandoff", () => {
	it("still waits on the first clip", () => {
		assert.deepEqual(
			previewClipHandoff({
				seenFrame: false,
				mediaChanged: true,
				inGap: false,
				gapSeconds: 0,
			}),
			{ resetSeenFrame: true, holdLastFrame: false },
		);
	});

	it("keeps the last frame across a short gap and does not reload the next clip", () => {
		assert.deepEqual(
			previewClipHandoff({
				seenFrame: true,
				mediaChanged: true,
				inGap: true,
				gapSeconds: 0.18,
			}),
			{ resetSeenFrame: false, holdLastFrame: true },
		);
		assert.deepEqual(
			previewClipHandoff({
				seenFrame: true,
				mediaChanged: true,
				inGap: false,
				gapSeconds: 0,
			}),
			{ resetSeenFrame: false, holdLastFrame: false },
		);
	});

	it("does not freeze the preview across a long empty stretch", () => {
		assert.deepEqual(
			previewClipHandoff({
				seenFrame: true,
				mediaChanged: true,
				inGap: true,
				gapSeconds: 2,
			}),
			{ resetSeenFrame: false, holdLastFrame: false },
		);
	});
});
