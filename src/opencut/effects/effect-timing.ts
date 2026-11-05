import {
	anchorEffectToClips,
	placeTransitionWithDuration,
	type ClipSpan,
} from "@/opencut/effects/clip-anchor";
import { pictureRows } from "@/opencut/effects/apply-all-transitions";
import { registerDefaultEffects } from "@/opencut/effects/definitions";
import { effectsRegistry } from "@/opencut/effects/registry";
import type { SceneTracks } from "@/opencut/timeline";
import { mediaTimeFromSeconds, mediaTimeToSeconds, type MediaTime } from "@/opencut/wasm";

/** Used when the timeline has no clip to snap to. */
const FALLBACK_SECONDS = 1;

export type EffectPlacement = {
	startTime: MediaTime;
	duration: MediaTime;
};

/** True when at least one video clip exists on the timeline for transitions to attach to. */
export function canPlaceTransitionOnTracks({
	tracks,
}: {
	tracks: SceneTracks;
}): boolean {
	return pictureRows({ tracks }).length > 0;
}

/**
 * Start and duration for an effect placed at `time`.
 * Snaps to the cut between clips, the head of a clip, or the tail of a clip.
 */
export function effectTimingAt({
	time,
	tracks,
}: {
	time: MediaTime;
	tracks: SceneTracks;
}): EffectPlacement {
	return placementFromSpan({
		time,
		span: anchorEffectToClips({
			time: mediaTimeToSeconds({ time }),
			tracks: visualClipTracks({ tracks }),
		}),
	});
}

/**
 * Where a transition rests: the head, tail, or cut of a video clip.
 * A time in the middle of a clip snaps to the nearer edge, so it cannot sit mid-clip.
 */
export function transitionTimingAt({
	time,
	tracks,
}: {
	time: MediaTime;
	tracks: SceneTracks;
}): EffectPlacement {
	return placementFromSpan({
		time,
		span: anchorEffectToClips({
			time: mediaTimeToSeconds({ time }),
			tracks: videoClipTracks({ tracks }),
		}),
	});
}

/**
 * Start time for a transition dragged to `time`.
 * Always the nearest video head, tail, or cut, so the block cannot rest elsewhere.
 * Returns null when `effectType` is not a transition.
 */
export function fixedTransitionStart({
	time,
	tracks,
	effectType,
	duration,
}: {
	time: MediaTime;
	tracks: SceneTracks;
	effectType: string;
	/** Length already on the block, so a drag does not snap it back to one second. */
	duration?: MediaTime;
}): MediaTime | null {
	registerDefaultEffects();
	if (!effectsRegistry.has(effectType)) return null;
	const definition = effectsRegistry.get(effectType);
	if ((definition.category ?? "effect") !== "transition") return null;
	if (duration == null) return transitionTimingAt({ time, tracks }).startTime;

	const timeSec = mediaTimeToSeconds({ time });
	const rows = videoClipTracks({ tracks });
	const anchorSpan = anchorEffectToClips({ time: timeSec, tracks: rows });
	const matchingRow =
		rows.find((clips) => {
			const s = anchorEffectToClips({ time: timeSec, tracks: [clips] });
			return (
				s &&
				anchorSpan &&
				Math.abs(s.start - anchorSpan.start) < 1e-4 &&
				s.kind === anchorSpan.kind
			);
		}) ??
		rows[0] ??
		[];

	const placed = placeTransitionWithDuration({
		time: timeSec,
		clips: matchingRow,
		duration: mediaTimeToSeconds({ time: duration }),
	});
	if (!placed) return transitionTimingAt({ time, tracks }).startTime;
	return mediaTimeFromSeconds({ seconds: Math.max(0, placed.start) });
}

function placementFromSpan({
	time,
	span,
}: {
	time: MediaTime;
	span: { start: number; duration: number } | null;
}): EffectPlacement {
	if (!span) {
		return {
			startTime: time,
			duration: mediaTimeFromSeconds({ seconds: FALLBACK_SECONDS }),
		};
	}
	return {
		startTime: mediaTimeFromSeconds({ seconds: Math.max(0, span.start) }),
		duration: mediaTimeFromSeconds({ seconds: span.duration }),
	};
}

/** Main track plus overlay tracks that are not themselves effects. */
function visualClipTracks({ tracks }: { tracks: SceneTracks }): ClipSpan[][] {
	const clipTracks: ClipSpan[][] = [spansFrom({ elements: tracks.main.elements })];
	for (const track of tracks.overlay) {
		if (track.type === "effect") continue;
		clipTracks.push(spansFrom({ elements: track.elements }));
	}
	return clipTracks;
}

/** Picture clips on the main track and any video overlay tracks. */
function videoClipTracks({ tracks }: { tracks: SceneTracks }): ClipSpan[][] {
	const rows = pictureRows({ tracks });
	return rows.length > 0 ? rows : [[]];
}

function spansFrom({
	elements,
}: {
	elements: Array<{ startTime: MediaTime; duration: MediaTime }>;
}): ClipSpan[] {
	return elements.map((element) => {
		const start = mediaTimeToSeconds({ time: element.startTime });
		return {
			start,
			end: start + mediaTimeToSeconds({ time: element.duration }),
		};
	});
}
