import { resolveScroClipNumber } from "@/opencut/embed/scro-clip-number";
import {
	SMOOTH_SILENCE_GAP_SECONDS,
	naturalSpeechTrim,
} from "@/opencut/embed/scro-smooth-silence-pack";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

/**
 * Before video is generated (`fileSeconds` absent), use the storyboard duration.
 * Once the generated video is ready (`fileSeconds > 0`), use the real video length.
 * Lip-sync clips are trimmed on the server when they finish generating. Speech bounds
 * still apply a natural trim for clips that were generated before that.
 */
export function storyboardPlacement({
	storyboardSeconds,
	fileSeconds,
	speechTrimStart = 0,
	speechTrimEnd = 0,
	smoothSilence = true,
}: {
	storyboardSeconds: number;
	fileSeconds?: number;
	speechTrimStart?: number;
	speechTrimEnd?: number;
	smoothSilence?: boolean;
}): {
	visibleSeconds: number;
	sourceSeconds: number;
	trimStartSeconds: number;
	trimEndSeconds: number;
	packAdvanceSeconds: number;
} {
	const storyboard = Math.max(0, storyboardSeconds);
	if (fileSeconds == null || fileSeconds <= 0) {
		return {
			visibleSeconds: storyboard,
			sourceSeconds: storyboard,
			trimStartSeconds: 0,
			trimEndSeconds: 0,
			packAdvanceSeconds: storyboard,
		};
	}
	const file = fileSeconds;
	const rawStart = smoothSilence ? speechTrimStart || 0 : 0;
	const rawEnd = smoothSilence ? speechTrimEnd || 0 : 0;
	if (rawStart > 0 || rawEnd > 0) {
		const natural = naturalSpeechTrim({
			duration: file,
			trimStart: rawStart,
			trimEnd: rawEnd,
		});
		const cut = natural.trimStart > 0.04 || natural.trimEnd > 0.04;
		return {
			visibleSeconds: natural.visible,
			sourceSeconds: file,
			trimStartSeconds: natural.trimStart,
			trimEndSeconds: natural.trimEnd,
			// Server-trimmed lip-sync files already keep a breath, so a near-zero
			// client cut must not insert another pause between clips.
			packAdvanceSeconds: natural.visible + (cut ? SMOOTH_SILENCE_GAP_SECONDS : 0),
		};
	}
	return {
		visibleSeconds: file,
		sourceSeconds: file,
		trimStartSeconds: 0,
		trimEndSeconds: 0,
		packAdvanceSeconds: file,
	};
}

type ScroMediaLike = {
	name: string;
	type: string;
	duration?: number;
	scroClipNumber?: number;
	speechTrimStart?: number;
	speechTrimEnd?: number;
};

/** Storyboard or confirmed video timing for a Scro clip file. Null when this asset is not one. */
export function placementForScroMedia({
	asset,
	clips,
	smoothSilence = true,
}: {
	asset: ScroMediaLike;
	clips: ScroVideoSeedClip[] | undefined;
	smoothSilence?: boolean;
}) {
	if (asset.type !== "video" || !clips?.length) return null;
	const clipNumber = resolveScroClipNumber({ asset, clips });
	if (clipNumber == null) return null;
	const storyboardSeconds = clips.find((clip) => clip.clipNumber === clipNumber)?.durationSeconds;
	if (storyboardSeconds == null) return null;
	return {
		clipNumber,
		...storyboardPlacement({
			storyboardSeconds,
			fileSeconds: asset.duration,
			speechTrimStart: asset.speechTrimStart,
			speechTrimEnd: asset.speechTrimEnd,
			smoothSilence,
		}),
	};
}

export type FitElement = {
	id: string;
	clipNumber: number | null;
	startSeconds: number;
	durationSeconds: number;
	trimStartSeconds: number;
	trimEndSeconds: number;
	sourceSeconds: number | null;
	fileSeconds: number | null;
	speechTrimStart?: number;
	speechTrimEnd?: number;
};

export type FitPatch = {
	id: string;
	startSeconds: number;
	durationSeconds: number;
	trimStartSeconds: number;
	trimEndSeconds: number;
	sourceSeconds: number;
	durationChanged: boolean;
};

/**
 * Rearranges main-track clips sequentially with no overlap.
 * Before video generation, clips use their storyboard duration; once a real video length
 * is confirmed (`fileSeconds > 0`), untouched clips adopt their speech-trimmed visible length
 * and subsequent clips shift so the timeline stays contiguous without overlap.
 */
export function fitFullLengthPlacements({
	elements,
	storyboard,
	smoothSilence = true,
}: {
	elements: FitElement[];
	storyboard: Array<{ clipNumber: number; durationSeconds: number }>;
	smoothSilence?: boolean;
}): FitPatch[] {
	if (elements.length === 0) return [];
	const byNumber = new Map(storyboard.map((clip) => [clip.clipNumber, clip.durationSeconds]));
	const sorted = [...elements].sort((a, b) => {
		if (Math.abs(a.startSeconds - b.startSeconds) > 0.02) {
			return a.startSeconds - b.startSeconds;
		}
		if (
			a.clipNumber != null &&
			b.clipNumber != null &&
			a.clipNumber !== b.clipNumber
		) {
			return a.clipNumber - b.clipNumber;
		}
		return a.id.localeCompare(b.id);
	});
	const fitted = new Map<
		string,
		{ duration: number; trimStart: number; trimEnd: number; source: number }
	>();
	const clipCounts = new Map<number, number>();
	for (const element of sorted) {
		if (element.clipNumber == null) continue;
		clipCounts.set(element.clipNumber, (clipCounts.get(element.clipNumber) ?? 0) + 1);
	}

	for (const element of sorted) {
		if (element.clipNumber == null) continue;
		if ((clipCounts.get(element.clipNumber) ?? 0) > 1) continue;
		const storyboardSeconds = byNumber.get(element.clipNumber);
		if (storyboardSeconds == null) continue;
		const fileSeconds =
			element.fileSeconds != null && element.fileSeconds > 0
				? element.fileSeconds
				: undefined;
		const place = storyboardPlacement({
			storyboardSeconds,
			fileSeconds,
			speechTrimStart: element.speechTrimStart,
			speechTrimEnd: element.speechTrimEnd,
			smoothSilence,
		});
		const trimmedPlace = storyboardPlacement({
			storyboardSeconds,
			fileSeconds,
			speechTrimStart: element.speechTrimStart,
			speechTrimEnd: element.speechTrimEnd,
			smoothSilence: true,
		});
		const isUntrimmed =
			element.trimStartSeconds <= 0.05 && element.trimEndSeconds <= 0.05;
		const matchesAutoSpeechTrim =
			Math.abs(element.trimStartSeconds - trimmedPlace.trimStartSeconds) <= 0.05 &&
			Math.abs(element.trimEndSeconds - trimmedPlace.trimEndSeconds) <= 0.05;
		// Older auto-trims used the raw detector bounds; still treat them as auto so
		// talking-head clips pick up the natural keep + inter-clip gap.
		const matchesRawSpeechTrim =
			Math.abs(element.trimStartSeconds - (element.speechTrimStart ?? 0)) <= 0.05 &&
			Math.abs(element.trimEndSeconds - (element.speechTrimEnd ?? 0)) <= 0.05 &&
			((element.speechTrimStart ?? 0) > 0.02 || (element.speechTrimEnd ?? 0) > 0.02);
		const isLegacyStoryboardTrim =
			fileSeconds != null &&
			element.trimStartSeconds <= 0.05 &&
			Math.abs(element.durationSeconds - storyboardSeconds) <= 0.05 &&
			Math.abs(element.durationSeconds + element.trimEndSeconds - fileSeconds) <= 0.1;
		if (!isUntrimmed && !matchesAutoSpeechTrim && !matchesRawSpeechTrim && !isLegacyStoryboardTrim) continue;

		// A split piece whose duration is neither the storyboard duration, the full file,
		// nor the speech-trimmed visible duration should keep its split duration.
		if (
			fileSeconds != null &&
			!isLegacyStoryboardTrim &&
			!matchesAutoSpeechTrim &&
			Math.abs(element.durationSeconds - storyboardSeconds) > 0.3 &&
			Math.abs(element.durationSeconds - fileSeconds) > 0.3 &&
			Math.abs(element.durationSeconds - trimmedPlace.visibleSeconds) > 0.3
		) {
			continue;
		}

		if (
			Math.abs(element.durationSeconds - place.visibleSeconds) > 0.02 ||
			Math.abs(element.trimStartSeconds - place.trimStartSeconds) > 0.02 ||
			Math.abs(element.trimEndSeconds - place.trimEndSeconds) > 0.02
		) {
			fitted.set(element.id, {
				duration: place.visibleSeconds,
				trimStart: place.trimStartSeconds,
				trimEnd: place.trimEndSeconds,
				source: place.sourceSeconds,
			});
		}
	}

	const patches: FitPatch[] = [];
	let previousNewEnd = 0;
	sorted.forEach((element, index) => {
		const next = fitted.get(element.id);
		const duration = next?.duration ?? element.durationSeconds;
		const start = index === 0 ? 0 : previousNewEnd;
		const source = next?.source ?? element.sourceSeconds ?? duration;
		const trimStart = next?.trimStart ?? element.trimStartSeconds;
		const trimEnd = next?.trimEnd ?? element.trimEndSeconds;
		const durationChanged = next != null;
		const startChanged = Math.abs(start - element.startSeconds) > 0.02;
		if (durationChanged || startChanged) {
			patches.push({
				id: element.id,
				startSeconds: start,
				durationSeconds: duration,
				trimStartSeconds: trimStart,
				trimEndSeconds: trimEnd,
				sourceSeconds: source,
				durationChanged,
			});
		}
		const speechGap =
			smoothSilence &&
			((next?.trimStart ?? element.trimStartSeconds) > 0.04 ||
				(next?.trimEnd ?? element.trimEndSeconds) > 0.04)
				? SMOOTH_SILENCE_GAP_SECONDS
				: 0;
		previousNewEnd = start + duration + (index < sorted.length - 1 ? speechGap : 0);
	});
	return patches;
}

/**
 * Find the earliest start time on the main track at or after `requestedStart`
 * where a span of `duration` does not overlap any existing element.
 * When the main track is empty, returns `0`.
 */
export function nonOverlappingMainTrackStart({
	spans,
	requestedStart,
	duration,
}: {
	spans: ReadonlyArray<{ startTime: number; duration: number }>;
	requestedStart: number;
	duration: number;
}): number {
	if (spans.length === 0) {
		return 0;
	}
	const sorted = [...spans].sort((a, b) => a.startTime - b.startTime);
	let candidate = requestedStart < 0 ? 0 : requestedStart;
	for (const span of sorted) {
		const spanEnd = span.startTime + span.duration;
		if (candidate + duration <= span.startTime) {
			break;
		}
		if (candidate < spanEnd && candidate + duration > span.startTime) {
			candidate = spanEnd;
		}
	}
	return candidate;
}
