import { resolveScroClipNumber } from "@/opencut/embed/scro-clip-number";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

/**
 * Before video is generated (`fileSeconds` absent), use the storyboard duration.
 * Once the generated video is ready (`fileSeconds > 0`), use the real video length.
 */
export function storyboardPlacement({
	storyboardSeconds,
	fileSeconds,
}: {
	storyboardSeconds: number;
	fileSeconds?: number;
}): { visibleSeconds: number; sourceSeconds: number; trimEndSeconds: number } {
	const storyboard = Math.max(0, storyboardSeconds);
	const file = fileSeconds != null && fileSeconds > 0 ? fileSeconds : storyboard;
	return {
		visibleSeconds: file,
		sourceSeconds: file,
		trimEndSeconds: 0,
	};
}

type ScroMediaLike = {
	name: string;
	type: string;
	duration?: number;
	scroClipNumber?: number;
};

/** Storyboard or confirmed video timing for a Scro clip file. Null when this asset is not one. */
export function placementForScroMedia({
	asset,
	clips,
}: {
	asset: ScroMediaLike;
	clips: ScroVideoSeedClip[] | undefined;
}) {
	if (asset.type !== "video" || !clips?.length) return null;
	const clipNumber = resolveScroClipNumber({ asset, clips });
	if (clipNumber == null) return null;
	const storyboardSeconds = clips.find((clip) => clip.clipNumber === clipNumber)?.durationSeconds;
	if (storyboardSeconds == null) return null;
	return {
		clipNumber,
		...storyboardPlacement({ storyboardSeconds, fileSeconds: asset.duration }),
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
};

export type FitPatch = {
	id: string;
	startSeconds: number;
	durationSeconds: number;
	trimEndSeconds: number;
	sourceSeconds: number;
	durationChanged: boolean;
};

/**
 * Rearranges main-track clips sequentially with no overlap.
 * Before video generation, clips use their storyboard duration; once a real video length
 * is confirmed (`fileSeconds > 0`), untouched clips expand/shrink to their real video length
 * and subsequent clips shift so the timeline stays contiguous without overlap.
 */
export function fitFullLengthPlacements({
	elements,
	storyboard,
}: {
	elements: FitElement[];
	storyboard: Array<{ clipNumber: number; durationSeconds: number }>;
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
	const fitted = new Map<string, { duration: number; trimEnd: number; source: number }>();
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
		const isUntrimmed =
			element.trimStartSeconds <= 0.05 && element.trimEndSeconds <= 0.05;
		const isLegacyStoryboardTrim =
			fileSeconds != null &&
			element.trimStartSeconds <= 0.05 &&
			Math.abs(element.durationSeconds - storyboardSeconds) <= 0.05 &&
			Math.abs(element.durationSeconds + element.trimEndSeconds - fileSeconds) <= 0.1;
		if (!isUntrimmed && !isLegacyStoryboardTrim) continue;

		// A split piece whose duration is neither the storyboard duration nor the full file
		// should keep its split duration.
		if (
			fileSeconds != null &&
			!isLegacyStoryboardTrim &&
			Math.abs(element.durationSeconds - storyboardSeconds) > 0.3 &&
			Math.abs(element.durationSeconds - fileSeconds) > 0.3
		) {
			continue;
		}

		const place = storyboardPlacement({
			storyboardSeconds,
			fileSeconds,
		});
		if (
			Math.abs(element.durationSeconds - place.visibleSeconds) > 0.02 ||
			Math.abs(element.trimEndSeconds - place.trimEndSeconds) > 0.02
		) {
			fitted.set(element.id, {
				duration: place.visibleSeconds,
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
		const trimEnd = next?.trimEnd ?? element.trimEndSeconds;
		const durationChanged = next != null;
		const startChanged = Math.abs(start - element.startSeconds) > 0.02;
		if (durationChanged || startChanged) {
			patches.push({
				id: element.id,
				startSeconds: start,
				durationSeconds: duration,
				trimEndSeconds: trimEnd,
				sourceSeconds: source,
				durationChanged,
			});
		}
		previousNewEnd = start + duration;
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
