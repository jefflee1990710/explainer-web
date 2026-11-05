import {
	anchorEffectToClips,
	listPictureTransitionSlots,
	placeTransitionWithDuration,
	transitionResizeLimits,
	type ClipSpan,
} from "@/opencut/effects/clip-anchor";
import { isTransitionElement } from "@/opencut/effects/transition-layout";
import {
	applyPlacement,
	getDefaultInsertIndexForTrack,
	resolveTrackPlacement,
} from "@/opencut/timeline/placement";
import { buildEffectElement } from "@/opencut/timeline/element-utils";
import type {
	 CreateEffectElement,
	EffectElement,
	OverlayTrack,
	SceneTracks,
	TimelineElement,
} from "@/opencut/timeline";
import { generateUUID } from "@/opencut/utils/id";
import {
	addMediaTime,
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	type MediaTime,
} from "@/opencut/wasm";

/** Drop existing transitions, then place this one on the heading, every cut, and the ending. */
export function tracksWithTransitionOnAllCuts({
	tracks,
	effectType,
}: {
	tracks: SceneTracks;
	effectType: string;
}): SceneTracks | null {
	// Main track, and any video row above it. A cut only exists between clips on the same row.
	const slots = listPictureTransitionSlots(pictureRows({ tracks }));
	if (slots.length === 0) return null;

	const cleaned = stripTransitions({ tracks });
	const elements: EffectElement[] = slots.map((slot) => ({
		...buildEffectElement({
			effectType,
			startTime: mediaTimeFromSeconds({ seconds: slot.start }),
			duration: mediaTimeFromSeconds({ seconds: slot.duration }),
		}),
		id: generateUUID(),
	}));
	const placed = applyPlacement({
		tracks: cleaned,
		placementResult: {
			kind: "newTrack",
			trackType: "effect",
			insertIndex: getDefaultInsertIndexForTrack({
				tracks: cleaned,
				trackType: "effect",
			}),
			insertPosition: null,
		},
		elements,
	});
	return placed?.updatedTracks ?? null;
}

/**
 * Insert or replace a single transition on the timeline.
 * Returns null when the timeline has no video clips to attach the transition to.
 * Replaces any existing transition overlapping the same time span so transitions never stack.
 */
export function upsertTransitionElementInTracks({
	tracks,
	element,
}: {
	tracks: SceneTracks;
	element: CreateEffectElement & { id?: string };
}): SceneTracks | null {
	const rows = pictureRows({ tracks });
	if (rows.length === 0) return null;

	const fullElement: EffectElement = {
		...element,
		id: element.id ?? generateUUID(),
	};
	const start = fullElement.startTime;
	const end = addMediaTime({ a: start, b: fullElement.duration });

	const cleaned = stripOverlappingTransitions({
		tracks,
		startTime: start,
		endTime: end,
		excludeId: fullElement.id,
	});

	const placementResult = resolveTrackPlacement({
		tracks: cleaned,
		elementType: "effect",
		timeSpans: [{ startTime: fullElement.startTime, duration: fullElement.duration }],
		strategy: { type: "firstAvailable" },
	});
	if (!placementResult) return null;

	const placed = applyPlacement({
		tracks: cleaned,
		placementResult,
		elements: [fullElement],
	});
	return placed?.updatedTracks ?? null;
}

/**
 * Ensure all transitions on the timeline remain anchored to valid video clip heads, tails, or cuts.
 * Removes transitions if all video clips were deleted, and re-snaps orphaned transitions.
 */
export function reconcileTransitionsWithVideoTracks({
	tracks,
}: {
	tracks: SceneTracks;
}): SceneTracks {
	const hasAnyTransition = tracks.overlay.some(
		(track) =>
			track.type === "effect" &&
			track.elements.some((el) => isTransitionElement(el)),
	);
	if (!hasAnyTransition) return tracks;

	const rows = pictureRows({ tracks });
	if (rows.length === 0) {
		return stripTransitions({ tracks });
	}

	let changed = false;
	const reanchoredTransitions: EffectElement[] = [];
	const nonTransitionOverlay: OverlayTrack[] = [];

	for (const track of tracks.overlay) {
		if (track.type !== "effect") {
			nonTransitionOverlay.push(track);
			continue;
		}
		const nonTransitions: EffectElement[] = [];
		for (const el of track.elements) {
			if (!isTransitionElement(el)) {
				nonTransitions.push(el);
				continue;
			}
			const startSec = mediaTimeToSeconds({ time: el.startTime });
			const durSec = mediaTimeToSeconds({ time: el.duration });
			const isValidOnSomeRow = rows.some(
				(clips) =>
					transitionResizeLimits({
						start: startSec,
						duration: durSec,
						clips,
					}) !== null,
			);
			if (isValidOnSomeRow) {
				reanchoredTransitions.push(el);
				continue;
			}

			// Orphaned transition: snap its midpoint to the nearest valid head, tail, or cut
			const midpoint = startSec + durSec / 2;
			const anchorSpan = anchorEffectToClips({
				time: midpoint,
				tracks: rows,
			});
			if (!anchorSpan) {
				changed = true;
				continue;
			}
			// Find the row that matched and preserve custom duration if possible
			const bestRow =
				rows.find((clips) => {
					const s = anchorEffectToClips({ time: midpoint, tracks: [clips] });
					return (
						s &&
						Math.abs(s.start - anchorSpan.start) < 1e-4 &&
						s.kind === anchorSpan.kind
					);
				}) ?? rows[0];
			const placed =
				placeTransitionWithDuration({
					time: midpoint,
					clips: bestRow,
					duration: durSec,
				}) ?? anchorSpan;
			const nextStart = mediaTimeFromSeconds({
				seconds: Math.max(0, placed.start),
			});
			const nextDuration = mediaTimeFromSeconds({
				seconds: placed.duration,
			});
			if (nextStart !== el.startTime || nextDuration !== el.duration) {
				changed = true;
			}
			reanchoredTransitions.push({
				...el,
				startTime: nextStart,
				duration: nextDuration,
			});
		}

		if (nonTransitions.length > 0) {
			nonTransitionOverlay.push({ ...track, elements: nonTransitions });
		}
	}

	// Deduplicate overlapping transitions (later transition wins)
	const deduped: EffectElement[] = [];
	for (let i = reanchoredTransitions.length - 1; i >= 0; i--) {
		const candidate = reanchoredTransitions[i];
		const cStart = candidate.startTime;
		const cEnd = cStart + candidate.duration;
		const overlapsKept = deduped.some((kept) => {
			const kStart = kept.startTime;
			const kEnd = kStart + kept.duration;
			return cStart < kEnd - 10 && cEnd > kStart + 10;
		});
		if (overlapsKept) {
			changed = true;
			continue;
		}
		deduped.unshift(candidate);
	}

	// Also check if transitions were spread across multiple transition-only tracks
	const transitionOnlyTrackCount = tracks.overlay.filter(
		(t) =>
			t.type === "effect" &&
			t.elements.length > 0 &&
			t.elements.every((el) => isTransitionElement(el)),
	).length;
	if (!changed && transitionOnlyTrackCount <= 1) {
		return tracks;
	}

	let nextTracks: SceneTracks = {
		...tracks,
		overlay: nonTransitionOverlay,
	};
	if (deduped.length === 0) {
		return nextTracks;
	}

	const existingTransitionTrackId = tracks.overlay.find(
		(t) =>
			t.type === "effect" &&
			t.elements.some((el) => isTransitionElement(el)),
	)?.id;

	const transitionTrack: OverlayTrack = {
		id: existingTransitionTrackId ?? generateUUID(),
		name: "Effect",
		type: "effect",
		hidden: false,
		elements: deduped.sort((a, b) => a.startTime - b.startTime),
	};

	return {
		...nextTracks,
		overlay: [transitionTrack, ...nextTracks.overlay],
	};
}

export function pictureRows({ tracks }: { tracks: SceneTracks }): ClipSpan[][] {
	const rows: ClipSpan[][] = [];
	const main = spansFrom({ elements: tracks.main.elements });
	if (main.length > 0) rows.push(main);
	for (const track of tracks.overlay) {
		if (track.type !== "video") continue;
		const clips = spansFrom({ elements: track.elements });
		if (clips.length > 0) rows.push(clips);
	}
	return rows;
}

function spansFrom({
	elements,
}: {
	elements: Array<Pick<TimelineElement, "startTime" | "duration">>;
}): ClipSpan[] {
	return elements.map((element) => spanFrom({ element }));
}

function spanFrom({
	element,
}: {
	element: { startTime: MediaTime; duration: MediaTime };
}): ClipSpan {
	const start = mediaTimeToSeconds({ time: element.startTime });
	return {
		start,
		end: start + mediaTimeToSeconds({ time: element.duration }),
	};
}

function stripOverlappingTransitions({
	tracks,
	startTime,
	endTime,
	excludeId,
}: {
	tracks: SceneTracks;
	startTime: MediaTime;
	endTime: MediaTime;
	excludeId?: string;
}): SceneTracks {
	const overlay: OverlayTrack[] = [];
	for (const track of tracks.overlay) {
		if (track.type !== "effect") {
			overlay.push(track);
			continue;
		}
		const elements = track.elements.filter((element) => {
			if (!isTransitionElement(element)) return true;
			if (excludeId && element.id === excludeId) return false;
			const elStart = element.startTime;
			const elEnd = elStart + element.duration;
			const overlaps = elStart < endTime - 10 && elEnd > startTime + 10;
			return !overlaps;
		});
		if (elements.length === 0) continue;
		overlay.push({ ...track, elements });
	}
	return { ...tracks, overlay };
}

function stripTransitions({ tracks }: { tracks: SceneTracks }): SceneTracks {
	const overlay: OverlayTrack[] = [];
	for (const track of tracks.overlay) {
		if (track.type !== "effect") {
			overlay.push(track);
			continue;
		}
		const elements = track.elements.filter((element) => !isTransitionElement(element));
		if (elements.length === 0) continue;
		overlay.push({ ...track, elements });
	}
	return { ...tracks, overlay };
}
