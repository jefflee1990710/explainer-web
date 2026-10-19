import { clipNumberFromName } from "@/opencut/embed/scro-clip-number";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import type { MediaAsset } from "@/opencut/media/types";

export const DEFAULT_MEDIA_FETCH_TIMEOUT_MS = 20_000;
export const DEFAULT_MEDIA_POOL_CONCURRENCY = 4;

/**
 * Find an already-loaded media asset in OpenCut's MediaManager that matches
 * the clip's current videoUrl, posterUrl, or placeholder state so we do not
 * re-download and re-decode the same asset on every seed/reconcile/update.
 */
export function findReusableClipAsset({
	clip,
	assets,
	clipSources,
}: {
	clip: ScroVideoSeedClip;
	assets: MediaAsset[];
	clipSources: Record<string, string>;
}): MediaAsset | null {
	const useVideo = Boolean(clip.videoUrl && !clip.staleVideo);
	const wantedUrl = useVideo ? clip.videoUrl : clip.posterUrl || clip.videoUrl;
	const wantedType = useVideo ? "video" : "image";

	if (wantedUrl) {
		for (let i = assets.length - 1; i >= 0; i--) {
			const asset = assets[i];
			if (asset.type !== wantedType) continue;
			// A shared poster URL must not let Clip 2 reuse Clip 1's file.
			// The Assets panel keeps one row per clip, so a shared id hides the rest.
			const owner = asset.scroClipNumber ?? clipNumberFromName(asset.name);
			if (owner !== clip.clipNumber) continue;
			const recordedUrl = clipSources[asset.id];
			const matchesSource =
				recordedUrl === wantedUrl ||
				(wantedType === "image" &&
					(asset.scroPosterUrl === wantedUrl || asset.thumbnailUrl === wantedUrl));
			if (matchesSource) return asset;
		}
		return null;
	}

	// No videoUrl or posterUrl yet: reuse an existing non-1x1 placeholder for this clip.
	for (let i = assets.length - 1; i >= 0; i--) {
		const asset = assets[i];
		if (
			asset.scroClipNumber === clip.clipNumber &&
			asset.scroPlaceholder === true &&
			(asset.width ?? 0) > 16 &&
			(asset.height ?? 0) > 16
		) {
			return asset;
		}
	}
	return null;
}

/**
 * Fetch a media Blob with an AbortController timeout so a stalled CDN or network
 * socket cannot freeze the editor boot overlay forever.
 */
export async function fetchMediaBlobWithTimeout({
	url,
	timeoutMs = DEFAULT_MEDIA_FETCH_TIMEOUT_MS,
	fetchImpl = fetch,
}: {
	url: string;
	timeoutMs?: number;
	fetchImpl?: typeof fetch;
}): Promise<Blob | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetchImpl(url, { signal: controller.signal });
		if (!response.ok) return null;
		return await response.blob();
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Run async tasks over an array with bounded concurrency while preserving input order.
 */
export async function runConcurrentMediaPool<T, R>({
	items,
	concurrency = DEFAULT_MEDIA_POOL_CONCURRENCY,
	worker,
}: {
	items: readonly T[];
	concurrency?: number;
	worker: (item: T, index: number) => Promise<R>;
}): Promise<R[]> {
	if (items.length === 0) return [];
	const limit = Math.max(1, Math.min(concurrency, items.length));
	const results = new Array<R>(items.length);
	let nextIndex = 0;

	async function runLane() {
		while (true) {
			const index = nextIndex++;
			if (index >= items.length) return;
			results[index] = await worker(items[index], index);
		}
	}

	await Promise.all(Array.from({ length: limit }, () => runLane()));
	return results;
}
