import type { SoundEffectCategoryId } from "@/opencut/sounds/types";
import type { LibrarySound } from "@/service/sound-effect/library-sound";

export type { LibrarySound, SoundEffectCategoryId };

export type TimelineAudioClipInput = {
	clipNumber: number;
	line: string;
	visualScene?: string;
	motionCamera?: string;
	startSec?: number;
	durationSec?: number;
};

export type TimelineTransitionCue = {
	effectType: string;
	cutSec: number;
	durationSec: number;
};

export type TimelineVisualPopCue = {
	kind: "onscreen-text" | "sticker" | "broll";
	label: string;
	startSec: number;
};

export type StructuralSfxCandidate = {
	targetTimeSec: number;
	query: string;
	category: SoundEffectCategoryId;
	reason: string;
	priority: number;
};

export type PlannedSfxInsertion = {
	clipNumber: number;
	query: string;
	reason: string;
	beat: "start" | "mid" | "end";
	category?: SoundEffectCategoryId;
	/** Optional fractional position (0..1) inside the clip where the action occurs. */
	offsetRatio?: number;
	/** Optional exact timeline timestamp (e.g. for a transition cut or text pop-in). */
	targetTimeSec?: number;
	sound: LibrarySound;
};

export type PlannedBgmSelection = {
	mood: string;
	englishSearchQuery: string;
	reason: string;
	sound: LibrarySound;
};

export type SpeechWindow = {
	startSec: number;
	endSec: number;
};

export type BgmVolumeKeyframePoint = {
	timeSec: number;
	valueDb: number;
};

/**
 * Resolve when an SFX should start on the timeline.
 * Supports exact `targetTimeSec` (cuts/pops), `offsetRatio` (0..1 inside clip), or `beat` ("start" | "mid" | "end"),
 * and shifts earlier by `peakOffsetSec` so the acoustic attack peak lands on the visual beat.
 */
export function computeSfxStartSeconds({
	clipStartSec,
	clipDurSec,
	beat,
	offsetRatio,
	targetTimeSec,
	peakOffsetSec = 0,
}: {
	clipStartSec: number;
	clipDurSec: number;
	beat: "start" | "mid" | "end";
	offsetRatio?: number;
	targetTimeSec?: number;
	peakOffsetSec?: number;
}): number {
	const safePeak =
		Number.isFinite(peakOffsetSec) && peakOffsetSec > 0
			? Math.min(peakOffsetSec, 1.2)
			: 0;

	let anchorSec: number;
	if (typeof targetTimeSec === "number" && Number.isFinite(targetTimeSec)) {
		anchorSec = Math.max(0, targetTimeSec);
	} else if (
		typeof offsetRatio === "number" &&
		Number.isFinite(offsetRatio) &&
		offsetRatio >= 0 &&
		offsetRatio <= 1
	) {
		anchorSec = clipStartSec + clipDurSec * offsetRatio;
	} else if (beat === "start") {
		anchorSec = clipStartSec;
	} else if (beat === "end") {
		anchorSec = Math.max(clipStartSec, clipStartSec + clipDurSec - 0.45);
	} else {
		anchorSec = clipStartSec + clipDurSec * 0.42;
	}

	const aligned = Math.max(0, anchorSec - safePeak);
	return Math.round(aligned * 100) / 100;
}

/**
 * Scan the first `maxScanSeconds` of a decoded audio channel in 20ms RMS windows
 * to find the acoustic attack peak offset in seconds.
 */
export function detectAudioPeakOffsetSeconds({
	samples,
	sampleRate,
	maxScanSeconds = 1.5,
}: {
	samples: Float32Array;
	sampleRate: number;
	maxScanSeconds?: number;
}): number {
	if (!samples.length || sampleRate <= 0) return 0;
	const windowSamples = Math.max(1, Math.round(sampleRate * 0.02));
	const limitSamples = Math.min(
		samples.length,
		Math.round(sampleRate * maxScanSeconds),
	);
	let bestRms = 0;
	let bestCenterSample = 0;

	for (let start = 0; start < limitSamples; start += windowSamples) {
		const end = Math.min(limitSamples, start + windowSamples);
		let sumSq = 0;
		for (let i = start; i < end; i++) {
			const s = samples[i];
			sumSq += s * s;
		}
		const rms = Math.sqrt(sumSq / Math.max(1, end - start));
		if (rms > bestRms) {
			bestRms = rms;
			bestCenterSample = start + (end - start) / 2;
		}
	}

	if (bestRms < 1e-4) return 0;
	return Math.round((bestCenterSample / sampleRate) * 100) / 100;
}

/**
 * Deterministically map timeline transitions and visual pop-ins (on-screen text, stickers, B-roll)
 * to concrete SFX cues, deduplicating cues that land within `minGapSec` of a higher-priority cue.
 */
export function mapTimelineCuesToSfxCandidates({
	transitions = [],
	visualPops = [],
	minGapSec = 0.45,
}: {
	transitions?: TimelineTransitionCue[];
	visualPops?: TimelineVisualPopCue[];
	minGapSec?: number;
}): StructuralSfxCandidate[] {
	const raw: StructuralSfxCandidate[] = [];

	for (const tr of transitions) {
		if (!Number.isFinite(tr.cutSec) || tr.cutSec < 0) continue;
		const type = tr.effectType.toLowerCase();
		if (type === "flash") {
			raw.push({
				targetTimeSec: Math.round(tr.cutSec * 100) / 100,
				query: "camera flash shutter click",
				category: "ui",
				reason: `Transition (${tr.effectType})`,
				priority: 1,
			});
		} else if (type === "zoom") {
			raw.push({
				targetTimeSec: Math.round(tr.cutSec * 100) / 100,
				query: "fast zoom whoosh transition",
				category: "whoosh",
				reason: `Transition (${tr.effectType})`,
				priority: 1,
			});
		} else if (
			type.startsWith("wipe") ||
			type.startsWith("slide") ||
			type.startsWith("iris") ||
			type === "barn" ||
			type === "clock"
		) {
			raw.push({
				targetTimeSec: Math.round(tr.cutSec * 100) / 100,
				query: "clean swoosh transition",
				category: "whoosh",
				reason: `Transition (${tr.effectType})`,
				priority: 1,
			});
		} else {
			raw.push({
				targetTimeSec: Math.round(tr.cutSec * 100) / 100,
				query: "soft cinematic whoosh transition",
				category: "whoosh",
				reason: `Transition (${tr.effectType})`,
				priority: 1,
			});
		}
	}

	for (const pop of visualPops) {
		if (!Number.isFinite(pop.startSec) || pop.startSec < 0) continue;
		if (pop.kind === "onscreen-text" || pop.kind === "sticker") {
			raw.push({
				targetTimeSec: Math.round(pop.startSec * 100) / 100,
				query: "subtle ui pop notification ding",
				category: "ui",
				reason: `On-screen ${pop.kind}: ${pop.label.slice(0, 24)}`,
				priority: 2,
			});
		} else if (pop.kind === "broll") {
			raw.push({
				targetTimeSec: Math.round(pop.startSec * 100) / 100,
				query: "soft swoosh transition",
				category: "whoosh",
				reason: `B-Roll entrance: ${pop.label.slice(0, 24)}`,
				priority: 3,
			});
		}
	}

	// Sort by priority first so transitions win over overlapping pops, then deduplicate within minGapSec
	const byPriority = raw
		.slice()
		.sort((a, b) => a.priority - b.priority || a.targetTimeSec - b.targetTimeSec);
	const kept: StructuralSfxCandidate[] = [];
	for (const candidate of byPriority) {
		const collides = kept.some(
			(existing) =>
				Math.abs(existing.targetTimeSec - candidate.targetTimeSec) < minGapSec,
		);
		if (!collides) kept.push(candidate);
	}

	return kept.sort((a, b) => a.targetTimeSec - b.targetTimeSec);
}

/**
 * Tile / loop a BGM track so it covers the entire `timelineDurationSec` without cutting off mid-video.
 */
export function buildBgmSegmentsForTimeline({
	timelineDurationSec,
	soundDurationSec,
}: {
	timelineDurationSec: number;
	soundDurationSec: number;
}): Array<{ startSec: number; durationSec: number }> {
	const total = Math.max(0, Math.round(timelineDurationSec * 100) / 100);
	if (total <= 0) return [];
	const loopDur =
		Number.isFinite(soundDurationSec) && soundDurationSec >= 4
			? Math.round(soundDurationSec * 100) / 100
			: total;

	if (total <= loopDur) {
		return [{ startSec: 0, durationSec: total }];
	}

	const segments: Array<{ startSec: number; durationSec: number }> = [];
	let cursor = 0;
	while (cursor < total - 0.05) {
		const rem = Math.round((total - cursor) * 100) / 100;
		const segDur = Math.min(loopDur, rem);
		if (segDur < 0.25) break;
		segments.push({
			startSec: Math.round(cursor * 100) / 100,
			durationSec: segDur,
		});
		cursor += segDur;
	}
	return segments;
}

/**
 * Build local-time volume keyframe points for a BGM segment:
 * - Ducks to `duckedDb` during `speechWindows`
 * - Lifts to `unduckedDb` during silent intro/outro or pauses >= 0.65s
 * - Smoothly fades out to `-42 dB` over the final `fadeOutSec` of the timeline
 */
export function buildBgmAutoDuckingKeyframes({
	segmentStartSec,
	segmentDurationSec,
	timelineDurationSec,
	speechWindows,
	duckedDb = AI_BGM_DUCKED_VOLUME_DB,
	unduckedDb = AI_BGM_VOLUME_DB,
	fadeOutSec = 1.5,
}: {
	segmentStartSec: number;
	segmentDurationSec: number;
	timelineDurationSec: number;
	speechWindows: SpeechWindow[];
	duckedDb?: number;
	unduckedDb?: number;
	fadeOutSec?: number;
}): BgmVolumeKeyframePoint[] {
	const segEndSec = segmentStartSec + segmentDurationSec;
	const rampSec = 0.22;
	const minGapToUnduckSec = 0.65;

	// Merge speech windows that are separated by less than minGapToUnduckSec so BGM doesn't pump on brief breaths
	const sortedSpeech = speechWindows
		.filter((w) => w.endSec > w.startSec)
		.map((w) => ({ startSec: Math.max(0, w.startSec), endSec: w.endSec }))
		.sort((a, b) => a.startSec - b.startSec);

	const mergedSpeech: SpeechWindow[] = [];
	for (const w of sortedSpeech) {
		const prev = mergedSpeech[mergedSpeech.length - 1];
		if (prev && w.startSec - prev.endSec < minGapToUnduckSec) {
			prev.endSec = Math.max(prev.endSec, w.endSec);
		} else {
			mergedSpeech.push({ ...w });
		}
	}

	const rawPoints: Array<{ absSec: number; valueDb: number }> = [];
	const isSpeakingAt = (absSec: number) =>
		mergedSpeech.some(
			(w) => absSec >= w.startSec - 0.05 && absSec <= w.endSec + 0.05,
		);

	rawPoints.push({
		absSec: segmentStartSec,
		valueDb: isSpeakingAt(segmentStartSec) ? duckedDb : unduckedDb,
	});

	for (const w of mergedSpeech) {
		if (w.endSec <= segmentStartSec || w.startSec >= segEndSec) continue;

		const duckStart = Math.max(segmentStartSec, w.startSec - rampSec);
		const duckFull = Math.max(segmentStartSec, Math.min(segEndSec, w.startSec));
		const duckHoldEnd = Math.max(
			segmentStartSec,
			Math.min(segEndSec, w.endSec),
		);
		const unduckDone = Math.min(segEndSec, w.endSec + rampSec);

		if (duckStart > segmentStartSec + 0.05) {
			rawPoints.push({ absSec: duckStart, valueDb: unduckedDb });
		}
		rawPoints.push({ absSec: duckFull, valueDb: duckedDb });
		rawPoints.push({ absSec: duckHoldEnd, valueDb: duckedDb });
		if (unduckDone < segEndSec - 0.05) {
			rawPoints.push({ absSec: unduckDone, valueDb: unduckedDb });
		}
	}

	const fadeStartAbs = Math.max(0, timelineDurationSec - Math.max(0.3, fadeOutSec));
	if (segEndSec > fadeStartAbs) {
		const clampedFadeStart = Math.max(segmentStartSec, fadeStartAbs);
		const filtered = rawPoints.filter((p) => p.absSec < clampedFadeStart - 0.05);
		const levelBeforeFade = isSpeakingAt(clampedFadeStart) ? duckedDb : unduckedDb;
		filtered.push({ absSec: clampedFadeStart, valueDb: levelBeforeFade });
		filtered.push({ absSec: segEndSec, valueDb: -42 });
		rawPoints.length = 0;
		rawPoints.push(...filtered);
	} else {
		rawPoints.push({
			absSec: segEndSec,
			valueDb: isSpeakingAt(segEndSec) ? duckedDb : unduckedDb,
		});
	}

	// Convert to segment-local seconds, sort, and deduplicate timestamps within 20ms
	const localPoints: BgmVolumeKeyframePoint[] = [];
	for (const pt of rawPoints.sort((a, b) => a.absSec - b.absSec)) {
		const localSec = Math.round(
			Math.max(0, Math.min(segmentDurationSec, pt.absSec - segmentStartSec)) * 100,
		) / 100;
		const last = localPoints[localPoints.length - 1];
		if (last && Math.abs(last.timeSec - localSec) < 0.02) {
			last.valueDb = pt.valueDb;
		} else {
			localPoints.push({ timeSec: localSec, valueDb: pt.valueDb });
		}
	}

	return localPoints;
}

export const AI_SFX_NAME_PREFIX = "SFX";
export const AI_BGM_NAME_PREFIX = "BGM";
/** Short Foley hits — a bit under speech (0 dB = unity). */
export const AI_SFX_VOLUME_DB = -6;
/** Underscore bed in open beats — subtle under VO, never competing with speech. */
export const AI_BGM_VOLUME_DB = -16;
/** Underscore bed while VO is actively speaking (auto-ducked). */
export const AI_BGM_DUCKED_VOLUME_DB = -24;

export function isAiSfxElementName(name: string) {
	return /^SFX\b/i.test(name.trim());
}

export function isAiBgmElementName(name: string) {
	return /^BGM\b/i.test(name.trim());
}

/**
 * Resolve per-clip planning lines from the subtitle catalog, falling back to
 * seed clips (`englishVo` / `explainerScene` / `motionCamera` / `name`) when the
 * video has no spoken dialogue lines (e.g. silent explainers, Scro Swap, Teleport).
 */
export function resolveAutoAudioLines(
	catalogLines: ReadonlyArray<{ clipNumber: number; line: string }> | undefined | null,
	seedClips:
		| ReadonlyArray<{
				clipNumber: number;
				englishVo?: string;
				explainerScene?: string;
				motionCamera?: string;
				name?: string;
		  }>
		| undefined
		| null,
): Array<{ clipNumber: number; line: string }> {
	const validCatalog = (catalogLines ?? []).filter(
		(item) => typeof item.line === "string" && item.line.trim().length > 0,
	);
	if (validCatalog.length > 0) {
		return validCatalog.map((item) => ({
			clipNumber: item.clipNumber,
			line: item.line.trim(),
		}));
	}
	const fallback: Array<{ clipNumber: number; line: string }> = [];
	for (const clip of seedClips ?? []) {
		const vo = (clip.englishVo || "").trim();
		const validVo = vo && !/^\(\s*no\s+dialogue\s*\)$/i.test(vo) ? vo : "";
		const line =
			validVo ||
			(clip.explainerScene || "").trim() ||
			(clip.motionCamera || "").trim() ||
			(clip.name || "").trim();
		if (line) {
			fallback.push({ clipNumber: clip.clipNumber, line });
		}
	}
	return fallback;
}
