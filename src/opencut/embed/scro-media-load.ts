import { ALL_FORMATS, AudioBufferSink, BlobSource, Input, UrlSource } from "mediabunny";
import { clipNumberFromName } from "@/opencut/embed/scro-clip-number";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import { detectSpeechTrimBounds } from "@/opencut/media/silence-trim";
import type { MediaAsset } from "@/opencut/media/types";
import type { ProcessedMediaAsset } from "@/opencut/media/processing";

export const DEFAULT_MEDIA_FETCH_TIMEOUT_MS = 20_000;
export const DEFAULT_VIDEO_PROBE_TIMEOUT_MS = 4_500;
export const DEFAULT_MEDIA_POOL_CONCURRENCY = 4;

export type ProbedVideoMetadata = {
	duration?: number;
	width?: number;
	height?: number;
	fps?: number;
	hasAudio?: boolean;
	speechTrimStart?: number;
	speechTrimEnd?: number;
};

/**
 * Use HTTP Range streaming (`UrlSource`) when the MediaAsset is backed by a remote URL
 * with a 0-byte placeholder File, and `BlobSource` when backed by local File bytes.
 */
export function createMediaInputSource({
	file,
	url,
}: {
	file: File;
	url?: string;
}): BlobSource | UrlSource {
	if (file.size === 0 && url && /^https?:\/\//i.test(url)) {
		return new UrlSource(url);
	}
	return new BlobSource(file);
}

/**
 * Probe the MP4 metadata and decode its audio track to detect leading/trailing silence
 * (`speechTrimStart` / `speechTrimEnd`) so Talking-Head and VO clips join seamlessly.
 */
export async function probeVideoSpeechBoundsFromSource(
	source: BlobSource | UrlSource,
): Promise<ProbedVideoMetadata> {
	const input = new Input({
		source,
		formats: ALL_FORMATS,
	});
	try {
		const [duration, videoTrack, audioTrack] = await Promise.all([
			input.computeDuration(),
			input.getPrimaryVideoTrack(),
			input.getPrimaryAudioTrack(),
		]);
		const validDuration = Number.isFinite(duration) && duration > 0 ? duration : undefined;
		let speechTrimStart: number | undefined;
		let speechTrimEnd: number | undefined;

		if (audioTrack) {
			try {
				const sink = new AudioBufferSink(audioTrack);
				const chunks: AudioBuffer[] = [];
				let totalSamples = 0;
				for await (const { buffer } of sink.buffers(0)) {
					chunks.push(buffer);
					totalSamples += buffer.length;
				}
				if (chunks.length > 0 && totalSamples > 0) {
					const sampleRate = chunks[0].sampleRate;
					const numChannels = Math.min(2, chunks[0].numberOfChannels);
					const channels = Array.from(
						{ length: numChannels },
						() => new Float32Array(totalSamples),
					);
					let offset = 0;
					for (const chunk of chunks) {
						for (let ch = 0; ch < numChannels; ch++) {
							channels[ch].set(
								chunk.getChannelData(Math.min(ch, chunk.numberOfChannels - 1)),
								offset,
							);
						}
						offset += chunk.length;
					}
					const bounds = detectSpeechTrimBounds({
						channels,
						sampleRate,
						durationSeconds: validDuration,
					});
					if (bounds.speechDetected) {
						speechTrimStart = bounds.trimStartSeconds;
						speechTrimEnd = bounds.trimEndSeconds;
					}
				}
			} catch {
				// Ignore audio decode errors and fall back to untrimmed duration
			}
		}

		return {
			duration: validDuration,
			width: videoTrack?.displayWidth || undefined,
			height: videoTrack?.displayHeight || undefined,
			fps: 24,
			hasAudio: audioTrack !== null,
			speechTrimStart,
			speechTrimEnd,
		};
	} finally {
		input.dispose();
	}
}

export async function probeRemoteVideoMetadata(
	url: string,
): Promise<ProbedVideoMetadata> {
	return probeVideoSpeechBoundsFromSource(new UrlSource(url));
}

/**
 * Build a streaming video MediaAsset backed by `UrlSource` (HTTP Range requests) so the
 * editor can play immediately without downloading the entire MP4 file first.
 */
export async function createStreamingVideoAsset({
	url,
	name,
	posterUrl,
	fallbackDuration,
	fallbackWidth = 1080,
	fallbackHeight = 1920,
	probeTimeoutMs = DEFAULT_VIDEO_PROBE_TIMEOUT_MS,
	probeImpl = probeRemoteVideoMetadata,
}: {
	url: string;
	name: string;
	posterUrl?: string;
	fallbackDuration?: number;
	fallbackWidth?: number;
	fallbackHeight?: number;
	probeTimeoutMs?: number;
	probeImpl?: (url: string) => Promise<ProbedVideoMetadata>;
}): Promise<ProcessedMediaAsset> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let probed: ProbedVideoMetadata | null = null;
	try {
		probed = await Promise.race([
			probeImpl(url).catch(() => null),
			new Promise<null>((resolve) => {
				timer = setTimeout(() => resolve(null), probeTimeoutMs);
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}

	const fileName = /\.mp4$/i.test(name) ? name : `${name}.mp4`;
	const file = new File([], fileName, { type: "video/mp4" });
	return {
		name,
		type: "video",
		file,
		url,
		thumbnailUrl: posterUrl,
		duration: probed?.duration ?? fallbackDuration,
		width: probed?.width ?? fallbackWidth,
		height: probed?.height ?? fallbackHeight,
		fps: probed?.fps ?? 24,
		hasAudio: probed?.hasAudio ?? true,
		speechTrimStart: probed?.speechTrimStart,
		speechTrimEnd: probed?.speechTrimEnd,
	};
}

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
