import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	scroClipPrimaryKind,
	scroPreviewCanStartVideo,
	scroVideoActionLabel,
} from "@/opencut/embed/scro-preview-generate";

describe("scro preview generate button", () => {
	it("shows when the start still is ready and no video exists", () => {
		assert.equal(
			scroPreviewCanStartVideo({
				stage: "frames_ready",
				posterUrl: "https://cdn.example/start.webp",
				hasStartFrame: true,
			}),
			true,
		);
	});

	it("stays hidden once a video exists or generation has started", () => {
		assert.equal(
			scroPreviewCanStartVideo({
				stage: "video_ready",
				posterUrl: "https://cdn.example/start.webp",
				hasStartFrame: true,
				videoUrl: "https://cdn.example/clip.mp4",
			}),
			false,
		);
		assert.equal(
			scroPreviewCanStartVideo({
				stage: "video_generating",
				posterUrl: "https://cdn.example/start.webp",
				hasStartFrame: true,
			}),
			false,
		);
		assert.equal(
			scroPreviewCanStartVideo({
				stage: "frames_generating",
				hasStartFrame: false,
			}),
			false,
		);
		assert.equal(scroPreviewCanStartVideo(null), false);
	});

	it("offers another video when the render failed and the still is still current", () => {
		assert.equal(
			scroPreviewCanStartVideo({
				stage: "failed",
				posterUrl: "https://cdn.example/start.webp",
				hasStartFrame: true,
				retryVideo: true,
			}),
			true,
		);
		assert.equal(
			scroClipPrimaryKind({
				stage: "failed",
				hasStartFrame: true,
				retryVideo: true,
			}),
			"video",
		);
		assert.equal(
			scroVideoActionLabel({ stage: "failed", retryVideo: true, videoCost: 75 }),
			"Regenerate video · 75",
		);
	});

	it("keeps a failed frame on redraw, and a stale still ahead of a failed video", () => {
		assert.equal(
			scroClipPrimaryKind({
				stage: "failed",
				hasStartFrame: false,
			}),
			"frames",
		);
		assert.equal(
			scroPreviewCanStartVideo({
				stage: "failed",
				hasStartFrame: true,
				retryVideo: true,
				staleFrames: true,
				posterUrl: "https://cdn.example/start.webp",
			}),
			false,
		);
		assert.equal(
			scroClipPrimaryKind({
				stage: "failed",
				hasStartFrame: true,
				retryVideo: true,
				staleFrames: true,
			}),
			"frames",
		);
	});
});
