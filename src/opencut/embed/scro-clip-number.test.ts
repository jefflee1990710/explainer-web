import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	resolveElementScroClipNumber,
	resolveScroClipNumber,
} from "@/opencut/embed/scro-clip-number";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

const clips = [{ clipNumber: 1 }, { clipNumber: 2 }] as ScroVideoSeedClip[];

describe("scro clip number", () => {
	it("reads Clip N.mp4 when the storyboard contains that clip", () => {
		assert.equal(
			resolveScroClipNumber({
				asset: { name: "Clip 2.mp4" },
				clips,
			}),
			2,
		);
		assert.equal(
			resolveElementScroClipNumber({
				element: { type: "video", name: "Clip 1.mp4", mediaId: "m1" },
				assets: [{ id: "m1", name: "take.mp4" }],
				clips,
			}),
			1,
		);
	});

	it("ignores a Clip label that is not in the storyboard", () => {
		assert.equal(
			resolveElementScroClipNumber({
				element: { type: "video", name: "Clip 9.mp4" },
				assets: [],
				clips,
			}),
			null,
		);
	});

	it("prefers the stored clip number over the file name", () => {
		assert.equal(
			resolveElementScroClipNumber({
				element: { type: "video", name: "take.mp4", scroClipNumber: 2 },
				assets: [],
				clips,
			}),
			2,
		);
	});
});
