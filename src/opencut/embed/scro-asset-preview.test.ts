import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	collectStaleScroAssetIds,
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

	it("displays the ScroVideo card when only the scene still exists (frames_ready) and swaps to the new still on regenerate", () => {
		const merged = mergeScroMediaAssets({
			assets: [oldVideo, newStill],
			clips: [clip({ stage: "frames_ready", posterUrl: NEW_STILL })],
		});
		assert.deepEqual(
			merged.map((item) => item.id),
			["new-still"],
		);
	});

	it("displays the new start still card when frames were redrawn over an old video (staleVideo)", () => {
		const merged = mergeScroMediaAssets({
			assets: [oldVideo, newStill],
			clips: [clip({ stage: "video_ready", staleVideo: true, posterUrl: NEW_STILL })],
		});
		assert.deepEqual(
			merged.map((item) => item.id),
			["new-still"],
		);
	});

	it("shows the newest video when video_ready and drops loose scene stills", () => {
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

	it("displays a ScroVideo clip that only has a scene still (frames_ready)", () => {
		const merged = mergeScroMediaAssets({
			assets: [newStill],
			clips: [clip({ stage: "frames_ready", posterUrl: NEW_STILL })],
		});
		assert.deepEqual(
			merged.map((item) => item.id),
			["new-still"],
		);
	});

	it("drops standalone Clip N · Start stills while keeping one ScroVideo card per clip", () => {
		const restoredStartStill = asset({
			id: "restored-start",
			name: "Clip 1 · Start",
			type: "image",
			url: "https://cdn.example/explainer/v1/opencut/restored-start",
		});
		const clip2Still = asset({
			id: "clip2-still",
			name: "Clip 2",
			type: "image",
			url: "https://cdn.example/explainer/v1/frames/f2",
			scroClipNumber: 2,
		});
		const upload = asset({
			id: "upload",
			name: "logo.png",
			type: "image",
			url: "https://cdn.example/explainer/v1/opencut/upload",
		});
		assert.deepEqual(
			mergeScroMediaAssets({
				assets: [restoredStartStill, clip2Still, upload, newVideo],
				clips: [
					clip({ clipNumber: 1, stage: "video_ready", videoUrl: "https://cdn.example/clip-1.mp4" }),
					clip({ clipNumber: 2, stage: "frames_ready", posterUrl: "https://cdn.example/explainer/v1/frames/f2" }),
				],
			}).map((item) => item.id),
			["new-video", "clip2-still", "upload"],
		);
	});

	it("collectStaleScroAssetIds finds all old video and image assets for a regenerated clip while keeping active asset and user uploads", () => {
		const oldStill = asset({
			id: "old-still-1",
			name: "Clip 1 · Start",
			type: "image",
			url: "https://cdn.example/frames/old-1.jpg",
			scroClipNumber: 1,
		});
		const oldPlaceholder = asset({
			id: "old-placeholder-1",
			name: "Clip 1",
			type: "image",
			scroClipNumber: 1,
			scroPlaceholder: true,
		});
		const keepVideo = asset({
			id: "keep-video-1",
			name: "Clip 1.mp4",
			type: "video",
			scroClipNumber: 1,
		});
		const clip2Video = asset({
			id: "video-2",
			name: "Clip 2.mp4",
			type: "video",
			scroClipNumber: 2,
		});
		const orphanClip9Video = asset({
			id: "orphan-9",
			name: "Clip 9.mp4",
			type: "video",
			scroClipNumber: 9,
		});
		const userUpload = asset({
			id: "user-upload",
			name: "brand.png",
			type: "image",
			url: "https://cdn.example/brand.png",
		});

		const clips = [
			clip({ clipNumber: 1, stage: "video_ready", videoUrl: "https://cdn.example/c1.mp4" }),
			clip({ clipNumber: 2, stage: "video_ready", videoUrl: "https://cdn.example/c2.mp4" }),
		];

		// When clip 1 updates to keep-video-1, old-video, old-still-1, old-placeholder-1, and orphan-9 are stale
		const staleIds = collectStaleScroAssetIds({
			assets: [
				oldVideo,
				oldStill,
				oldPlaceholder,
				keepVideo,
				clip2Video,
				orphanClip9Video,
				userUpload,
			],
			clips,
			clipNumber: 1,
			keepAssetId: "keep-video-1",
		});

		assert.deepEqual(
			new Set(staleIds),
			new Set(["old-video", "old-still-1", "old-placeholder-1", "orphan-9"]),
		);
	});
});
