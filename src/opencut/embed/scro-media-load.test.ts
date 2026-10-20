import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createMediaInputSource,
	createStreamingVideoAsset,
	fetchMediaBlobWithTimeout,
	findReusableClipAsset,
	runConcurrentMediaPool,
} from "@/opencut/embed/scro-media-load";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import type { MediaAsset } from "@/opencut/media/types";

function asset(
	overrides: Partial<MediaAsset> & Pick<MediaAsset, "id" | "name" | "type">,
): MediaAsset {
	return {
		file: new File([], overrides.name),
		...overrides,
	};
}

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

describe("findReusableClipAsset", () => {
	it("reuses an existing video asset whose recorded source URL matches clip.videoUrl", () => {
		const videoAsset = asset({
			id: "asset-v1",
			name: "Clip 1",
			type: "video",
			scroClipNumber: 1,
		});
		const found = findReusableClipAsset({
			clip: clip({
				stage: "video_ready",
				videoUrl: "https://cdn.example/clip-1.mp4",
				posterUrl: "https://cdn.example/clip-1.webp",
			}),
			assets: [videoAsset],
			clipSources: { "asset-v1": "https://cdn.example/clip-1.mp4" },
		});
		assert.equal(found?.id, "asset-v1");
	});

	it("does not reuse an image asset when the clip now has a videoUrl", () => {
		const stillAsset = asset({
			id: "asset-s1",
			name: "Clip 1",
			type: "image",
			scroClipNumber: 1,
			scroPosterUrl: "https://cdn.example/clip-1.webp",
		});
		const found = findReusableClipAsset({
			clip: clip({
				stage: "video_ready",
				videoUrl: "https://cdn.example/clip-1.mp4",
				posterUrl: "https://cdn.example/clip-1.webp",
			}),
			assets: [stillAsset],
			clipSources: { "asset-s1": "https://cdn.example/clip-1.webp" },
		});
		assert.equal(found, null);
	});

	it("reuses an existing start-still image asset when sourceUrl matches posterUrl", () => {
		const stillAsset = asset({
			id: "asset-s1",
			name: "Clip 1",
			type: "image",
			scroClipNumber: 1,
			scroPosterUrl: "https://cdn.example/clip-1.webp",
		});
		const found = findReusableClipAsset({
			clip: clip({
				stage: "frames_ready",
				posterUrl: "https://cdn.example/clip-1.webp",
			}),
			assets: [stillAsset],
			clipSources: {},
		});
		assert.equal(found?.id, "asset-s1");
	});

	it("does not reuse another clip's still when the poster URL is the same", () => {
		const clip1Still = asset({
			id: "asset-s1",
			name: "Clip 1",
			type: "image",
			scroClipNumber: 1,
			scroPosterUrl: "https://cdn.example/shared.webp",
		});
		const found = findReusableClipAsset({
			clip: clip({
				clipNumber: 2,
				name: "Clip 2",
				stage: "frames_ready",
				posterUrl: "https://cdn.example/shared.webp",
			}),
			assets: [clip1Still],
			clipSources: {},
		});
		assert.equal(found, null);
	});

	it("reuses a non-stretched placeholder asset when clip has no media URL yet", () => {
		const placeholder = asset({
			id: "asset-p1",
			name: "Clip 1",
			type: "image",
			scroClipNumber: 1,
			scroPlaceholder: true,
			width: 1080,
			height: 1920,
		});
		const found = findReusableClipAsset({
			clip: clip({
				stage: "awaiting_frames",
			}),
			assets: [placeholder],
			clipSources: {},
		});
		assert.equal(found?.id, "asset-p1");
	});
});

describe("fetchMediaBlobWithTimeout", () => {
	it("aborts a stalled media download after timeoutMs and returns null", async () => {
		const blob = await fetchMediaBlobWithTimeout({
			url: "https://cdn.example/stalled.mp4",
			timeoutMs: 25,
			fetchImpl: (_url, init) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						reject(new DOMException("Aborted", "AbortError"));
					});
				}),
		});
		assert.equal(blob, null);
	});

	it("returns the blob when the response succeeds before timeoutMs", async () => {
		const expected = new Blob(["ok"], { type: "video/mp4" });
		const blob = await fetchMediaBlobWithTimeout({
			url: "https://cdn.example/clip.mp4",
			timeoutMs: 200,
			fetchImpl: async () => new Response(expected, { status: 200 }),
		});
		assert.equal(blob?.size, 2);
	});
});

describe("runConcurrentMediaPool", () => {
	it("runs items with bounded concurrency and preserves input order", async () => {
		let active = 0;
		let maxActive = 0;
		const results = await runConcurrentMediaPool({
			items: [1, 2, 3, 4, 5, 6],
			concurrency: 3,
			worker: async (n) => {
				active++;
				maxActive = Math.max(maxActive, active);
				await new Promise((resolve) => setTimeout(resolve, 10));
				active--;
				return n * 10;
			},
		});
		assert.ok(maxActive <= 3);
		assert.ok(maxActive >= 2);
		assert.deepEqual(results, [10, 20, 30, 40, 50, 60]);
	});
});

describe("withFontLoadTimeout", () => {
	it("resolves undefined instead of hanging when a Google Font promise stalls", async () => {
		const { withFontLoadTimeout } = await import("@/opencut/fonts/google-fonts");
		const result = await withFontLoadTimeout(
			new Promise<string>(() => {}),
			20,
		);
		assert.equal(result, undefined);
	});
});

describe("createStreamingVideoAsset & createMediaInputSource", () => {
	it("creates a 0-byte streaming video asset with remote HTTP URL and falls back to storyboard metadata when header probe times out", async () => {
		const asset = await createStreamingVideoAsset({
			url: "https://cdn.example/clip-1.mp4",
			name: "Clip 1",
			posterUrl: "https://cdn.example/poster-1.png",
			fallbackDuration: 5,
			fallbackWidth: 1080,
			fallbackHeight: 1920,
			probeTimeoutMs: 20,
			probeImpl: () => new Promise(() => {}),
		});
		assert.equal(asset.type, "video");
		assert.equal(asset.url, "https://cdn.example/clip-1.mp4");
		assert.equal(asset.file.size, 0);
		assert.equal(asset.thumbnailUrl, "https://cdn.example/poster-1.png");
		assert.equal(asset.duration, 5);
		assert.equal(asset.width, 1080);
		assert.equal(asset.height, 1920);
		assert.equal(asset.hasAudio, true);
	});

	it("uses probed header duration and dimensions when header probe succeeds quickly", async () => {
		const asset = await createStreamingVideoAsset({
			url: "https://cdn.example/clip-2.mp4",
			name: "Clip 2",
			posterUrl: "https://cdn.example/poster-2.png",
			fallbackDuration: 5,
			fallbackWidth: 1080,
			fallbackHeight: 1920,
			probeImpl: async () => ({
				duration: 5.17,
				width: 1440,
				height: 2560,
				fps: 24,
				hasAudio: true,
			}),
		});
		assert.equal(asset.duration, 5.17);
		assert.equal(asset.width, 1440);
		assert.equal(asset.height, 2560);
		assert.equal(asset.fps, 24);
	});

	it("createMediaInputSource returns UrlSource for 0-byte HTTP assets and BlobSource for local files", () => {
		const emptyFile = new File([], "Clip 1.mp4", { type: "video/mp4" });
		const urlSource = createMediaInputSource({
			file: emptyFile,
			url: "https://cdn.example/clip-1.mp4",
		});
		assert.equal(urlSource.constructor.name.includes("UrlSource"), true);

		const localFile = new File(["bytes"], "local.mp4", { type: "video/mp4" });
		const blobSource = createMediaInputSource({
			file: localFile,
			url: "blob:http://localhost:3000/123",
		});
		assert.equal(blobSource.constructor.name.includes("BlobSource"), true);
	});
});


