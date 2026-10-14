import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	fitFullLengthPlacements,
	storyboardPlacement,
} from "@/opencut/embed/scro-clip-duration";

describe("storyboard placement", () => {
	it("keeps the storyboard length and trims the generated tail", () => {
		const place = storyboardPlacement({ storyboardSeconds: 4, fileSeconds: 5.05 });
		assert.equal(place.visibleSeconds, 4);
		assert.equal(place.sourceSeconds, 5.05);
		assert.ok(Math.abs(place.trimEndSeconds - 1.05) < 0.001);
	});

	it("does not extend a clip past a shorter file", () => {
		const place = storyboardPlacement({ storyboardSeconds: 6, fileSeconds: 5.05 });
		assert.equal(place.visibleSeconds, 5.05);
		assert.equal(place.trimEndSeconds, 0);
	});
});

describe("fit full-length placements", () => {
	const storyboard = [
		{ clipNumber: 1, durationSeconds: 4 },
		{ clipNumber: 2, durationSeconds: 4 },
		{ clipNumber: 3, durationSeconds: 4 },
		{ clipNumber: 4, durationSeconds: 4 },
	];

	it("shrinks untouched full files and closes the gap behind them", () => {
		const patches = fitFullLengthPlacements({
			storyboard,
			elements: [
				element({ id: "left", clip: 1, start: 0, duration: 0.79, file: 5.05 }),
				element({ id: "right", clip: 1, start: 0.79, duration: 4.26, file: 5.05 }),
				element({ id: "c2", clip: 2, start: 5.05, duration: 5.05, file: 5.05 }),
				element({ id: "c3", clip: 3, start: 10.1, duration: 5.05, file: 5.05 }),
				element({ id: "c4", clip: 4, start: 15.15, duration: 5.05, file: 5.05 }),
			],
		});
		const byId = new Map(patches.map((patch) => [patch.id, patch]));
		assert.equal(byId.has("left"), false);
		assert.equal(byId.has("right"), false);
		assert.equal(byId.get("c2")?.durationSeconds, 4);
		assert.equal(byId.get("c2")?.startSeconds, 5.05);
		assert.ok(Math.abs((byId.get("c2")?.trimEndSeconds ?? 0) - 1.05) < 0.001);
		assert.ok(Math.abs((byId.get("c3")?.startSeconds ?? 0) - 9.05) < 0.001);
		assert.equal(byId.get("c3")?.durationSeconds, 4);
		assert.ok(Math.abs((byId.get("c4")?.startSeconds ?? 0) - 13.05) < 0.001);
	});

	it("leaves a clip that is already the storyboard length", () => {
		const patches = fitFullLengthPlacements({
			storyboard: [{ clipNumber: 1, durationSeconds: 3 }],
			elements: [element({ id: "c1", clip: 1, start: 0, duration: 3, file: 5.05 })],
		});
		assert.equal(patches.length, 0);
	});

	it("leaves a clip the user already trimmed", () => {
		const patches = fitFullLengthPlacements({
			storyboard: [{ clipNumber: 2, durationSeconds: 4 }],
			elements: [
				{
					...element({ id: "c2", clip: 2, start: 0, duration: 4.5, file: 5.05 }),
					trimEndSeconds: 0.55,
				},
			],
		});
		assert.equal(patches.length, 0);
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
	file: number;
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
