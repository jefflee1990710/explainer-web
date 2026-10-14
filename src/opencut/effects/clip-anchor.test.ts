import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	anchorEffectToClips,
	listApplyAllTransitionSlots,
	placeTransitionWithDuration,
	transitionResizeLimits,
	type ClipSpan,
} from "@/opencut/effects/clip-anchor";

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

	it("lists a cut between each joined clip and the last tail", () => {
		assert.deepEqual(
			listApplyAllTransitionSlots([
				{ start: 0, end: 10 },
				{ start: 10, end: 16 },
				{ start: 16, end: 20 },
			]),
			[
				{ start: 9.5, duration: 1 },
				{ start: 15.5, duration: 1 },
				{ start: 19, duration: 1 },
			],
		);
	});

	it("uses the outgoing tail when clips are far apart", () => {
		assert.deepEqual(
			listApplyAllTransitionSlots([
				{ start: 0, end: 10 },
				{ start: 14, end: 18 },
			]),
			[
				{ start: 9, duration: 1 },
				{ start: 17, duration: 1 },
			],
		);
	});

	it("places only the ending when there is one clip", () => {
		assert.deepEqual(listApplyAllTransitionSlots([{ start: 0, end: 10 }]), [
			{ start: 9, duration: 1 },
		]);
	});

	it("keeps a longer block on the tail instead of the one-second default", () => {
		assert.deepEqual(
			placeTransitionWithDuration({
				time: 8,
				clips: [{ start: 0, end: 10 }],
				duration: 2.5,
			}),
			{ start: 7.5, duration: 2.5 },
		);
	});

	it("keeps a longer block centered on the cut", () => {
		assert.deepEqual(
			placeTransitionWithDuration({
				time: 10,
				clips: [
					{ start: 0, end: 10 },
					{ start: 10, end: 16 },
				],
				duration: 2,
			}),
			{ start: 9, duration: 2 },
		);
	});

	it("locks the head and lets the free edge reach the end of the clip", () => {
		assert.deepEqual(
			transitionResizeLimits({
				start: 0,
				duration: 1,
				clips: [{ start: 0, end: 10 }],
			}),
			{
				fixedStart: true,
				fixedEnd: false,
				minStart: 0,
				maxEnd: 10,
				maxStart: 0,
				minEnd: 0,
			},
		);
	});

	it("locks the tail and lets the free edge reach the start of the clip", () => {
		assert.deepEqual(
			transitionResizeLimits({
				start: 9,
				duration: 1,
				clips: [{ start: 0, end: 10 }],
			}),
			{
				fixedStart: false,
				fixedEnd: true,
				minStart: 0,
				maxEnd: 10,
				maxStart: 10,
				minEnd: 10,
			},
		);
	});

	it("keeps a cut inside the block while both edges move", () => {
		assert.deepEqual(
			transitionResizeLimits({
				start: 9.5,
				duration: 1,
				clips: [
					{ start: 0, end: 10 },
					{ start: 10, end: 16 },
				],
			}),
			{
				fixedStart: false,
				fixedEnd: false,
				minStart: 0,
				maxEnd: 16,
				maxStart: 10,
				minEnd: 10,
			},
		);
	});

	it("returns no slots when there are no clips", () => {
		assert.deepEqual(listApplyAllTransitionSlots([]), []);
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
