import { anchorEffectToClips, type ClipSpan } from "@/opencut/effects/clip-anchor";
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
 * Where a transition rests: the head, tail, or cut of a video on the main track.
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
}: {
	time: MediaTime;
	tracks: SceneTracks;
	effectType: string;
}): MediaTime | null {
	registerDefaultEffects();
	if (!effectsRegistry.has(effectType)) return null;
	const definition = effectsRegistry.get(effectType);
	if ((definition.category ?? "effect") !== "transition") return null;
	return transitionTimingAt({ time, tracks }).startTime;
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

/** Picture clips on the main track. Transitions ignore text and sticker rows. */
function videoClipTracks({ tracks }: { tracks: SceneTracks }): ClipSpan[][] {
	return [spansFrom({ elements: tracks.main.elements })];
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
