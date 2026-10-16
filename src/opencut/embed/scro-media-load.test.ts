import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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

