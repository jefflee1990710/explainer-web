import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scroPreviewCanStartVideo } from "@/opencut/embed/scro-preview-generate";

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
});
