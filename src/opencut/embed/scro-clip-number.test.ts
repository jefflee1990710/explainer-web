import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isScroAssetEditLocked,
	isScroClipEditLocked,
	isScroClipLengthLocked,
	isScroElement,
	resolveElementScroClipNumber,
	resolveScroClipNumber,
} from "@/opencut/embed/scro-clip-number";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

const clips = [
	{ clipNumber: 1, stage: "frame_ready" },
	{ clipNumber: 2, stage: "video_ready", videoUrl: "https://cdn.example/c2.mp4" },
	{
		clipNumber: 3,
		stage: "video_ready",
		videoUrl: "https://cdn.example/c3.mp4",
		staleVideo: true,
	},
] as ScroVideoSeedClip[];

describe("scro clip number and edit locking", () => {
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

	it("ignores a Clip label or scroClipNumber that is not in the storyboard", () => {
		assert.equal(
			resolveElementScroClipNumber({
				element: { type: "video", name: "Clip 9.mp4" },
				assets: [],
				clips,
			}),
			null,
		);
		assert.equal(
			resolveElementScroClipNumber({
				element: { type: "video", name: "Clip 9", scroClipNumber: 9 },
				assets: [{ id: "m9", name: "Clip 9", scroClipNumber: 9 }],
				clips,
			}),
			null,
		);
		assert.equal(
			resolveScroClipNumber({
				asset: { name: "Clip 9", scroClipNumber: 9 },
				clips,
			}),
			null,
		);
		assert.equal(
			resolveScroClipNumber({
				asset: { name: "Clip 9" },
				clips: undefined,
			}),
			9,
		);
	});

	it("locks ScroVideo clips before video is generated and unlocks after video is ready", () => {
		// Still image / frame_ready before video generation -> locked
		assert.equal(
			isScroClipEditLocked({
				element: { type: "image", name: "Clip 1", mediaId: "m1", scroClipNumber: 1 },
				assets: [{ id: "m1", name: "Clip 1", type: "image", scroClipNumber: 1 }],
				clips,
			}),
			true,
		);
		assert.equal(
			isScroClipLengthLocked({
				element: { type: "image", name: "Clip 1", mediaId: "m1", scroClipNumber: 1 },
				assets: [{ id: "m1", name: "Clip 1", type: "image", scroClipNumber: 1 }],
				clips,
			}),
			true,
		);

		// Stale video while regenerating -> locked
		assert.equal(
			isScroClipEditLocked({
				element: { type: "video", name: "Clip 3", mediaId: "m3", scroClipNumber: 3 },
				assets: [{ id: "m3", name: "Clip 3", type: "video", scroClipNumber: 3 }],
				clips,
			}),
			true,
		);

		// Confirmed generated video -> unlocked for editing, still pinned to Timeline #1
		assert.equal(
			isScroClipEditLocked({
				element: { type: "video", name: "Clip 2", mediaId: "m2", scroClipNumber: 2 },
				assets: [{ id: "m2", name: "Clip 2", type: "video", scroClipNumber: 2 }],
				clips,
			}),
			false,
		);
		assert.equal(
			isScroElement({
				element: { type: "video", name: "Clip 2", mediaId: "m2", scroClipNumber: 2 },
				assets: [{ id: "m2", name: "Clip 2", type: "video", scroClipNumber: 2 }],
				clips,
			}),
			true,
		);

		// Asset-level lock check
		assert.equal(
			isScroAssetEditLocked({
				asset: { name: "Clip 1", type: "image", scroClipNumber: 1 },
				clips,
			}),
			true,
		);
		assert.equal(
			isScroAssetEditLocked({
				asset: { name: "Clip 2", type: "video", scroClipNumber: 2 },
				clips,
			}),
			false,
		);

		// Non-Scro media is never locked or pinned
		assert.equal(
			isScroClipLengthLocked({
				element: { type: "video", name: "b-roll.mp4" },
				assets: [],
				clips,
			}),
			false,
		);
		assert.equal(
			isScroElement({
				element: { type: "video", name: "b-roll.mp4" },
				assets: [],
				clips,
			}),
			false,
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
