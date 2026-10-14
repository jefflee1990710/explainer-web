import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { anchorEffectToClips, type ClipSpan } from "@/opencut/effects/clip-anchor";

const main = (clips: ClipSpan[]): ClipSpan[][] => [clips];

describe("anchorEffectToClips", () => {
	it("covers the head when the time is in the first half", () => {
		const span = anchorEffectToClips({
			time: 1.2,
			tracks: main([{ start: 0, end: 10 }]),
		});
		assert.deepEqual(span, { kind: "start", start: 0, duration: 1 });
	});

	it("covers the tail when the time is in the second half", () => {
		const span = anchorEffectToClips({
			time: 8,
			tracks: main([{ start: 0, end: 10 }]),
		});
		assert.deepEqual(span, { kind: "end", start: 9, duration: 1 });
	});

	it("centers on the cut when the time is near a join", () => {
		const span = anchorEffectToClips({
			time: 9.8,
			tracks: main([
				{ start: 0, end: 10 },
				{ start: 10, end: 16 },
			]),
		});
		assert.deepEqual(span, { kind: "between", start: 9.5, duration: 1 });
	});

	it("centers on a small gap between clips", () => {
		const span = anchorEffectToClips({
			time: 10.1,
			tracks: main([
				{ start: 0, end: 10 },
				{ start: 10.2, end: 14 },
			]),
		});
		assert.deepEqual(span, { kind: "between", start: 9.6, duration: 1 });
	});

	it("uses the nearer clip when the gap is wide", () => {
		const span = anchorEffectToClips({
			time: 11,
			tracks: main([
				{ start: 0, end: 10 },
				{ start: 14, end: 18 },
			]),
		});
		assert.deepEqual(span, { kind: "end", start: 9, duration: 1 });
	});

	it("places before the first clip on that clip's head", () => {
		const span = anchorEffectToClips({
			time: 0,
			tracks: main([{ start: 4, end: 9 }]),
		});
		assert.deepEqual(span, { kind: "start", start: 4, duration: 1 });
	});

	it("places after the last clip on that clip's tail", () => {
		const span = anchorEffectToClips({
			time: 30,
			tracks: main([{ start: 0, end: 6 }]),
		});
		assert.deepEqual(span, { kind: "end", start: 5, duration: 1 });
	});

	it("splits a short clip so the head and tail stay apart", () => {
		const span = anchorEffectToClips({
			time: 0.2,
			tracks: main([{ start: 0, end: 1 }]),
		});
		assert.deepEqual(span, { kind: "start", start: 0, duration: 0.5 });
	});

	it("prefers the closer track", () => {
		const span = anchorEffectToClips({
			time: 3,
			tracks: [
				[{ start: 0, end: 10 }],
				[{ start: 3, end: 4 }],
			],
		});
		assert.equal(span?.kind, "start");
		assert.equal(span?.start, 3);
	});

	it("prefers the cut when the time sits on the join", () => {
		const span = anchorEffectToClips({
			time: 10,
			tracks: main([
				{ start: 0, end: 10 },
				{ start: 10, end: 16 },
			]),
		});
		assert.deepEqual(span, { kind: "between", start: 9.5, duration: 1 });
	});

	it("returns null when there are no clips", () => {
		assert.equal(anchorEffectToClips({ time: 2, tracks: [[]] }), null);
	});

	it("refuses a transition dropped in the middle of a clip", () => {
		assert.equal(
			anchorEffectToClips({
				time: 5,
				tracks: main([{ start: 0, end: 10 }]),
				edgeOnly: true,
			}),
			null,
		);
	});

	it("accepts a transition on the head of a clip", () => {
		const span = anchorEffectToClips({
			time: 0.4,
			tracks: main([{ start: 0, end: 10 }]),
			edgeOnly: true,
		});
		assert.deepEqual(span, { kind: "start", start: 0, duration: 1 });
	});

	it("accepts a transition on the tail of a clip", () => {
		const span = anchorEffectToClips({
			time: 9.2,
			tracks: main([{ start: 0, end: 10 }]),
			edgeOnly: true,
		});
		assert.deepEqual(span, { kind: "end", start: 9, duration: 1 });
	});

	it("accepts a transition on the cut between two clips", () => {
		const span = anchorEffectToClips({
			time: 9.8,
			tracks: main([
				{ start: 0, end: 10 },
				{ start: 10, end: 16 },
			]),
			edgeOnly: true,
		});
		assert.deepEqual(span, { kind: "between", start: 9.5, duration: 1 });
	});

	it("refuses a transition far from every edge", () => {
		assert.equal(
			anchorEffectToClips({
				time: 12,
				tracks: main([
					{ start: 0, end: 10 },
					{ start: 14, end: 18 },
				]),
				edgeOnly: true,
			}),
			null,
		);
	});
});
