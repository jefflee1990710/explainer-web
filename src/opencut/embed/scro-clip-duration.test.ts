import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	fitFullLengthPlacements,
	nonOverlappingMainTrackStart,
	storyboardPlacement,
} from "@/opencut/embed/scro-clip-duration";

describe("storyboard placement", () => {
	it("uses the storyboard duration before video is generated", () => {
		const place = storyboardPlacement({ storyboardSeconds: 4 });
		assert.equal(place.visibleSeconds, 4);
		assert.equal(place.sourceSeconds, 4);
		assert.equal(place.trimEndSeconds, 0);
		assert.equal(place.packAdvanceSeconds, 4);
	});

	it("applies a natural speech trim and pack gap when talking-head bounds are present", () => {
		const place = storyboardPlacement({
			storyboardSeconds: 5,
			fileSeconds: 5,
			speechTrimStart: 0.4,
			speechTrimEnd: 0.8,
		});
		assert.equal(place.trimStartSeconds, 0.18);
		assert.equal(place.trimEndSeconds, 0.48);
		assert.equal(place.visibleSeconds, 4.34);
		assert.equal(place.packAdvanceSeconds, 4.52);
	});

	it("does not add a pack gap when the file is already inside the breath keep", () => {
		const place = storyboardPlacement({
			storyboardSeconds: 5,
			fileSeconds: 4.2,
			speechTrimStart: 0.1,
			speechTrimEnd: 0.12,
		});
		assert.equal(place.trimStartSeconds, 0);
		assert.equal(place.trimEndSeconds, 0);
		assert.equal(place.visibleSeconds, 4.2);
		assert.equal(place.packAdvanceSeconds, 4.2);
	});

	it("keeps full untrimmed video duration when smoothSilence is toggled off", () => {
		const place = storyboardPlacement({
			storyboardSeconds: 5,
			fileSeconds: 5,
			speechTrimStart: 0.4,
			speechTrimEnd: 0.8,
			smoothSilence: false,
		});
		assert.equal(place.trimStartSeconds, 0);
		assert.equal(place.trimEndSeconds, 0);
		assert.equal(place.visibleSeconds, 5);
		assert.equal(place.packAdvanceSeconds, 5);
	});

	it("uses the confirmed real video length after video is generated", () => {
		const longer = storyboardPlacement({ storyboardSeconds: 4, fileSeconds: 5.05 });
		assert.equal(longer.visibleSeconds, 5.05);
		assert.equal(longer.sourceSeconds, 5.05);
		assert.equal(longer.trimEndSeconds, 0);

		const shorter = storyboardPlacement({ storyboardSeconds: 6, fileSeconds: 5.05 });
		assert.equal(shorter.visibleSeconds, 5.05);
		assert.equal(shorter.sourceSeconds, 5.05);
		assert.equal(shorter.trimEndSeconds, 0);
	});
});

describe("fit full-length placements", () => {
	const storyboard = [
		{ clipNumber: 1, durationSeconds: 4 },
		{ clipNumber: 2, durationSeconds: 4 },
		{ clipNumber: 3, durationSeconds: 4 },
		{ clipNumber: 4, durationSeconds: 4 },
	];

	it("rearranges timeline sequentially with real video lengths and no overlap", () => {
		const patches = fitFullLengthPlacements({
			storyboard,
			elements: [
				// Clip 1 just finished generating (5.05s real video, placed at 0)
				element({ id: "c1", clip: 1, start: 0, duration: 5.05, file: 5.05 }),
				// Clip 2 finished generating (5.2s real video, still at old 4s start -> overlapping c1)
				element({ id: "c2", clip: 2, start: 4, duration: 4, file: 5.2 }),
				// Clip 3 still waiting for video (4s storyboard, at old 8s start)
				element({ id: "c3", clip: 3, start: 8, duration: 4, file: null }),
				// Clip 4 finished generating shorter than storyboard (3.5s real video)
				element({ id: "c4", clip: 4, start: 12, duration: 4, file: 3.5 }),
			],
		});
		const byId = new Map(patches.map((patch) => [patch.id, patch]));
		assert.equal(byId.has("c1"), false);
		assert.ok(Math.abs((byId.get("c2")?.startSeconds ?? 0) - 5.05) < 0.001);
		assert.ok(Math.abs((byId.get("c2")?.durationSeconds ?? 0) - 5.2) < 0.001);
		assert.equal(byId.get("c2")?.trimEndSeconds, 0);
		assert.ok(Math.abs((byId.get("c3")?.startSeconds ?? 0) - 10.25) < 0.001);
		assert.equal(byId.get("c3")?.durationSeconds, 4);
		assert.equal(byId.get("c3")?.durationChanged, false);
		assert.ok(Math.abs((byId.get("c4")?.startSeconds ?? 0) - 14.25) < 0.001);
		assert.ok(Math.abs((byId.get("c4")?.durationSeconds ?? 0) - 3.5) < 0.001);
	});

	it("preserves split pieces and user-trimmed clips after video is generated", () => {
		const patches = fitFullLengthPlacements({
			storyboard,
			elements: [
				element({ id: "left", clip: 1, start: 0, duration: 0.79, file: 5.05 }),
				element({ id: "right", clip: 1, start: 0.79, duration: 4.26, file: 5.05 }),
				{
					...element({ id: "c2", clip: 2, start: 5.05, duration: 4.5, file: 5.05 }),
					trimEndSeconds: 0.55,
				},
			],
		});
		assert.equal(patches.length, 0);
	});

	it("expands legacy storyboard-trimmed clips to full confirmed video length", () => {
		const patches = fitFullLengthPlacements({
			storyboard: [{ clipNumber: 1, durationSeconds: 4 }],
			elements: [
				{
					...element({ id: "c1", clip: 1, start: 0, duration: 4, file: 5.05 }),
					trimEndSeconds: 1.05,
				},
			],
		});
		assert.equal(patches.length, 1);
		assert.equal(patches[0]?.durationSeconds, 5.05);
		assert.equal(patches[0]?.trimEndSeconds, 0);
	});
});

describe("main track non-overlapping placement", () => {
	it("places ScroVideo clips on Timeline #1 without overlapping existing clips", () => {
		const spans = [
			{ startTime: 0, duration: 4000 },
			{ startTime: 4000, duration: 5000 },
		];
		const start = nonOverlappingMainTrackStart({
			spans,
			requestedStart: 2000,
			duration: 3000,
		});
		assert.equal(start, 9000);

		// Fits into a gap when large enough
		const gapStart = nonOverlappingMainTrackStart({
			spans: [
				{ startTime: 0, duration: 4000 },
				{ startTime: 8000, duration: 4000 },
			],
			requestedStart: 3000,
			duration: 4000,
		});
		assert.equal(gapStart, 4000);
	});
});

function element({
	id,
	clip,
	start,
	duration,
	file,
}: {
	id: string;
	clip: number;
	start: number;
	duration: number;
	file: number | null;
}) {
	return {
		id,
		clipNumber: clip,
		startSeconds: start,
		durationSeconds: duration,
		trimStartSeconds: 0,
		trimEndSeconds: 0,
		sourceSeconds: file,
		fileSeconds: file,
	};
}
