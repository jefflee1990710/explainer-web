/**
 * Speech boundary & silence detection for smooth Talking-Head / VO clip transitions in OpenCut.
 *
 * AI-generated video clips (e.g. 5s Hailuo / Seedance clips) often have 300–900ms of dead air
 * or mouth-settling silence before the first spoken word and after the last spoken word.
 * Concatenating two clips back-to-back combines Clip N's tail silence + Clip N+1's head silence
 * into an awkward 1–1.5s freeze at every cut.
 *
 * This module detects the active speech span `[speechStart, speechEnd]` using short-window RMS
 * energy relative to the clip's peak RMS, and leaves a natural breath pad (e.g. 220ms at the start
 * and 350ms at the end) so consecutive clips keep a natural spoken pause.
 */

export const SILENCE_WINDOW_SECONDS = 0.02; // 20ms analysis window
export const DEFAULT_SPEECH_HEAD_PAD_SECONDS = 0.22; // 220ms pre-speech breath pad
export const DEFAULT_SPEECH_TAIL_PAD_SECONDS = 0.35; // 350ms post-speech landing pad
export const MIN_TRIMMED_CLIP_DURATION_SECONDS = 0.8; // Never trim a clip shorter than 0.8s
export const MIN_SILENCE_TO_TRIM_SECONDS = 0.06; // Ignore tiny <60ms trims
export const AUDIO_BOUNDARY_FADE_SECONDS = 0.015; // 15ms micro-fade at clip edges to prevent clicks

export type SpeechBoundsResult = {
	trimStartSeconds: number;
	trimEndSeconds: number;
	visibleSeconds: number;
	sourceSeconds: number;
	speechDetected: boolean;
};

/**
 * Compute per-window RMS values across one or more audio channels.
 */
export function computeWindowRms({
	channels,
	sampleRate,
	windowSeconds = SILENCE_WINDOW_SECONDS,
}: {
	channels: readonly Float32Array[];
	sampleRate: number;
	windowSeconds?: number;
}): { rms: Float32Array; windowSamples: number } {
	if (channels.length === 0 || channels[0].length === 0 || sampleRate <= 0) {
		return { rms: new Float32Array(0), windowSamples: 1 };
	}
	const totalSamples = channels[0].length;
	const windowSamples = Math.max(1, Math.round(sampleRate * windowSeconds));
	const windowCount = Math.ceil(totalSamples / windowSamples);
	const rms = new Float32Array(windowCount);
	const numChannels = channels.length;

	for (let w = 0; w < windowCount; w++) {
		const start = w * windowSamples;
		const end = Math.min(totalSamples, start + windowSamples);
		const count = end - start;
		if (count <= 0) continue;

		let sumSquares = 0;
		for (let ch = 0; ch < numChannels; ch++) {
			const data = channels[ch];
			for (let i = start; i < end; i++) {
				const s = data[i];
				sumSquares += s * s;
			}
		}
		rms[w] = Math.sqrt(sumSquares / (count * numChannels));
	}

	return { rms, windowSamples };
}

/**
 * Detect leading and trailing silence from raw channel samples and return the optimal
 * `trimStartSeconds`, `trimEndSeconds`, and `visibleSeconds` for seamless clip-to-clip cuts.
 */
export function detectSpeechTrimBounds({
	channels,
	sampleRate,
	durationSeconds,
	headPadSeconds = DEFAULT_SPEECH_HEAD_PAD_SECONDS,
	tailPadSeconds = DEFAULT_SPEECH_TAIL_PAD_SECONDS,
}: {
	channels: readonly Float32Array[];
	sampleRate: number;
	durationSeconds?: number;
	headPadSeconds?: number;
	tailPadSeconds?: number;
}): SpeechBoundsResult {
	const totalSamples = channels[0]?.length ?? 0;
	const totalDuration =
		durationSeconds != null && durationSeconds > 0
			? durationSeconds
			: sampleRate > 0
				? totalSamples / sampleRate
				: 0;

	const untouched: SpeechBoundsResult = {
		trimStartSeconds: 0,
		trimEndSeconds: 0,
		visibleSeconds: totalDuration,
		sourceSeconds: totalDuration,
		speechDetected: false,
	};

	if (totalDuration <= MIN_TRIMMED_CLIP_DURATION_SECONDS || totalSamples === 0 || sampleRate <= 0) {
		return untouched;
	}

	const { rms, windowSamples } = computeWindowRms({ channels, sampleRate });
	if (rms.length === 0) return untouched;

	let peakRms = 0;
	for (let i = 0; i < rms.length; i++) {
		if (rms[i] > peakRms) peakRms = rms[i];
	}

	// Completely silent clip (below -50 dBFS): leave untouched so we don't collapse a B-roll clip.
	if (peakRms < 0.003) {
		return untouched;
	}

	// Adaptive threshold: 10% of peak RMS (~ -20 dB relative to peak), floored at 0.008 (~ -42 dBFS)
	// and capped at 0.035 so quiet voices are still detected.
	const threshold = Math.min(0.035, Math.max(0.008, peakRms * 0.1));

	// Require 2 consecutive active windows (40ms) when possible to ignore isolated 1-frame clicks/pops.
	let firstActiveWindow = -1;
	for (let i = 0; i < rms.length; i++) {
		const isSustained =
			rms[i] >= threshold && (i + 1 >= rms.length || rms[i + 1] >= threshold * 0.75);
		if (isSustained) {
			firstActiveWindow = i;
			break;
		}
	}
	if (firstActiveWindow === -1) {
		for (let i = 0; i < rms.length; i++) {
			if (rms[i] >= threshold) {
				firstActiveWindow = i;
				break;
			}
		}
	}
	if (firstActiveWindow === -1) return untouched;

	let lastActiveWindow = firstActiveWindow;
	for (let i = rms.length - 1; i >= firstActiveWindow; i--) {
		const isSustained =
			rms[i] >= threshold && (i - 1 < 0 || rms[i - 1] >= threshold * 0.75);
		if (isSustained) {
			lastActiveWindow = i;
			break;
		}
	}

	const windowDuration = windowSamples / sampleRate;
	const speechStart = firstActiveWindow * windowDuration;
	const speechEnd = Math.min(totalDuration, (lastActiveWindow + 1) * windowDuration);

	let rawTrimStart = Math.max(0, speechStart - headPadSeconds);
	let rawTrimEnd = Math.max(0, totalDuration - (speechEnd + tailPadSeconds));

	if (rawTrimStart < MIN_SILENCE_TO_TRIM_SECONDS) rawTrimStart = 0;
	if (rawTrimEnd < MIN_SILENCE_TO_TRIM_SECONDS) rawTrimEnd = 0;

	let visibleSeconds = totalDuration - rawTrimStart - rawTrimEnd;
	if (visibleSeconds < MIN_TRIMMED_CLIP_DURATION_SECONDS) {
		return untouched;
	}

	// Round to millisecond precision for clean timeline math
	const trimStartSeconds = Math.round(rawTrimStart * 1000) / 1000;
	const trimEndSeconds = Math.round(rawTrimEnd * 1000) / 1000;
	visibleSeconds = Math.max(
		MIN_TRIMMED_CLIP_DURATION_SECONDS,
		Math.round((totalDuration - trimStartSeconds - trimEndSeconds) * 1000) / 1000,
	);

	return {
		trimStartSeconds,
		trimEndSeconds,
		visibleSeconds,
		sourceSeconds: totalDuration,
		speechDetected: true,
	};
}
