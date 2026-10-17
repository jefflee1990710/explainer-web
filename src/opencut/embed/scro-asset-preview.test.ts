import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	mergeScroMediaAssets,
	scroAssetPreviewSrc,
} from "@/opencut/embed/scro-video-assets";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import type { MediaAsset } from "@/opencut/media/types";

const OLD_THUMB = "https://cdn.example/old-video-frame.jpg";
const NEW_STILL = "https://cdn.example/frames/new-start.jpg";
const NEW_VIDEO_THUMB = "https://cdn.example/frames/new-video-poster.jpg";

function clip(
	overrides: Partial<ScroVideoSeedClip> & Pick<ScroVideoSeedClip, "stage">,
): ScroVideoSeedClip {
	return {
		clipNumber: 1,
		durationSeconds: 4,
		name: "Clip 1",
		...overrides,
	};
}

function asset(
	overrides: Partial<MediaAsset> & Pick<MediaAsset, "id" | "name" | "type">,
): MediaAsset {
	return {
		file: new File([], overrides.name),
		...overrides,
	};
}

describe("scro asset preview after regenerate", () => {
	it("uses the new start still once it exists, even if the card is the old video", () => {
		const src = scroAssetPreviewSrc({
			asset: asset({
				id: "old-video",
				name: "Clip 1.mp4",
				type: "video",
				thumbnailUrl: OLD_THUMB,
			}),
			clip: clip({ stage: "frames_ready", posterUrl: NEW_STILL }),
		});
		assert.equal(src, NEW_STILL);
	});

	it("clears the old video thumb while the new start still is still drawing", () => {
		const src = scroAssetPreviewSrc({
			asset: asset({
				id: "old-video",
				name: "Clip 1.mp4",
				type: "video",
				thumbnailUrl: OLD_THUMB,
			}),
			clip: clip({ stage: "frames_generating", hasStartFrame: false }),
		});
		assert.equal(src, undefined);
	});

	it("uses the start still while a later end frame is still drawing", () => {
		const src = scroAssetPreviewSrc({
			asset: asset({
				id: "old-video",
				name: "Clip 1.mp4",
				type: "video",
				thumbnailUrl: OLD_THUMB,
			}),
			clip: clip({ stage: "frames_generating", posterUrl: NEW_STILL }),
		});
		assert.equal(src, NEW_STILL);
	});

	it("uses the new start still when frames were redrawn over an old video (staleVideo)", () => {
		const src = scroAssetPreviewSrc({
			asset: asset({
				id: "old-video",
				name: "Clip 1.mp4",
				type: "video",
				thumbnailUrl: OLD_THUMB,
			}),
			clip: clip({
				stage: "video_ready",
				staleVideo: true,
				posterUrl: NEW_STILL,
				videoUrl: "https://cdn.example/old-clip-1.mp4",
			}),
		});
		assert.equal(src, NEW_STILL);
	});

	it("keeps the finished video thumb after the new video is ready", () => {
		const src = scroAssetPreviewSrc({
			asset: asset({
				id: "new-video",
				name: "Clip 1.mp4",
				type: "video",
				thumbnailUrl: NEW_VIDEO_THUMB,
			}),
			clip: clip({
				stage: "video_ready",
				posterUrl: NEW_STILL,
				videoUrl: "https://cdn.example/clip-1.mp4",
			}),
		});
		assert.equal(src, NEW_VIDEO_THUMB);
	});
});

describe("merge scro media after regenerate", () => {
	const oldVideo = asset({
		id: "old-video",
		name: "Clip 1.mp4",
		type: "video",
		thumbnailUrl: OLD_THUMB,
		scroClipNumber: 1,
	});
	const newStill = asset({
		id: "new-still",
		name: "Clip 1",
		type: "image",
		url: NEW_STILL,
		thumbnailUrl: NEW_STILL,
		scroPosterUrl: NEW_STILL,
		scroClipNumber: 1,
	});
	const newVideo = asset({
		id: "new-video",
		name: "Clip 1.mp4",
		type: "video",
		thumbnailUrl: NEW_VIDEO_THUMB,
		scroClipNumber: 1,
	});

	it("keeps the clip video and hides the scene still", () => {
		const merged = mergeScroMediaAssets({
			assets: [oldVideo, newStill],
			clips: [clip({ stage: "frames_ready", posterUrl: NEW_STILL })],
		});
		assert.deepEqual(
			merged.map((item) => item.id),
			["old-video"],
		);
	});

	it("keeps the clip video when the still was redrawn over it", () => {
		const merged = mergeScroMediaAssets({
			assets: [oldVideo, newStill],
			clips: [clip({ stage: "video_ready", staleVideo: true, posterUrl: NEW_STILL })],
		});
		assert.deepEqual(
			merged.map((item) => item.id),
			["old-video"],
		);
	});

	it("shows the newest video and drops both scene stills", () => {
		const looseStill = asset({
			id: "loose-still",
			name: "start.webp",
			type: "image",
			url: NEW_STILL,
		});
		const upload = asset({
			id: "upload",
			name: "logo.png",
			type: "image",
			url: "https://cdn.example/logo.png",
		});
		const merged = mergeScroMediaAssets({
			assets: [oldVideo, newStill, looseStill, upload, newVideo],
			clips: [
				clip({
					stage: "video_ready",
					posterUrl: NEW_STILL,
					endPosterUrl: "https://cdn.example/frames/end.jpg",
					videoUrl: "https://cdn.example/clip-1.mp4",
				}),
			],
		});
		assert.deepEqual(
			merged.map((item) => item.id),
			["new-video", "upload"],
		);
	});

	it("omits a clip that only has a scene still", () => {
		const merged = mergeScroMediaAssets({
			assets: [newStill],
			clips: [clip({ stage: "frames_ready", posterUrl: NEW_STILL })],
		});
		assert.deepEqual(merged, []);
	});
});
