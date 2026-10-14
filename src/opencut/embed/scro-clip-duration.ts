import { resolveScroClipNumber } from "@/opencut/embed/scro-clip-number";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

// Generated files are often longer than the storyboard (provider minimum is 5s).
// The timeline block stays the storyboard length; the extra tail is trimEnd.
const FULL_FILE_SLACK_SECONDS = 0.35;

export function storyboardPlacement({
	storyboardSeconds,
	fileSeconds,
}: {
	storyboardSeconds: number;
	fileSeconds?: number;
}): { visibleSeconds: number; sourceSeconds: number; trimEndSeconds: number } {
	const storyboard = Math.max(0, storyboardSeconds);
	const file = fileSeconds != null && fileSeconds > 0 ? fileSeconds : storyboard;
	const visible = Math.min(storyboard, file);
	const source = Math.max(file, visible);
	return {
		visibleSeconds: visible,
		sourceSeconds: source,
		trimEndSeconds: Math.max(0, source - visible),
	};
}

type ScroMediaLike = {
	name: string;
	type: string;
	duration?: number;
	scroClipNumber?: number;
};

/** Storyboard timing for a Scro clip file. Null when this asset is not one. */
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
 * Untouched full-file drops become the storyboard length.
 * Later main-track clips that were butted against them shift left with the cut.
 */
export function fitFullLengthPlacements({
	elements,
	storyboard,
}: {
	elements: FitElement[];
	storyboard: Array<{ clipNumber: number; durationSeconds: number }>;
}): FitPatch[] {
	const byNumber = new Map(storyboard.map((clip) => [clip.clipNumber, clip.durationSeconds]));
	const sorted = [...elements].sort(
		(a, b) => a.startSeconds - b.startSeconds || a.id.localeCompare(b.id),
	);
	const fitted = new Map<string, { duration: number; trimEnd: number; source: number }>();

	for (const element of sorted) {
		if (element.clipNumber == null) continue;
		const storyboardSeconds = byNumber.get(element.clipNumber);
		if (storyboardSeconds == null) continue;
		if (element.trimStartSeconds > 0.05 || element.trimEndSeconds > 0.05) continue;
		const file = element.fileSeconds ?? element.sourceSeconds ?? element.durationSeconds;
		if (file <= storyboardSeconds + FULL_FILE_SLACK_SECONDS) continue;
		// A resized or split piece is not the whole file sitting on the timeline.
		if (Math.abs(element.durationSeconds - file) > 0.3) continue;
		const place = storyboardPlacement({ storyboardSeconds, fileSeconds: file });
		fitted.set(element.id, {
			duration: place.visibleSeconds,
			trimEnd: place.trimEndSeconds,
			source: place.sourceSeconds,
		});
	}
	if (fitted.size === 0) return [];

	const patches: FitPatch[] = [];
	let previousOriginalEnd = 0;
	let previousNewEnd = 0;
	sorted.forEach((element, index) => {
		const next = fitted.get(element.id);
		const duration = next?.duration ?? element.durationSeconds;
		const gap = index === 0 ? 0 : element.startSeconds - previousOriginalEnd;
		const start = index === 0 ? element.startSeconds : previousNewEnd + Math.max(0, gap);
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
		previousOriginalEnd = element.startSeconds + element.durationSeconds;
		previousNewEnd = start + duration;
	});
	return patches;
}
