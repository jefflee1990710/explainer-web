import {
	listPictureTransitionSlots,
	type ClipSpan,
} from "@/opencut/effects/clip-anchor";
import { isTransitionElement } from "@/opencut/effects/transition-layout";
import { applyPlacement, getDefaultInsertIndexForTrack } from "@/opencut/timeline/placement";
import { buildEffectElement } from "@/opencut/timeline/element-utils";
import type { EffectElement, OverlayTrack, SceneTracks, TimelineElement } from "@/opencut/timeline";
import { generateUUID } from "@/opencut/utils/id";
import { mediaTimeFromSeconds, mediaTimeToSeconds, type MediaTime } from "@/opencut/wasm";

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

function pictureRows({ tracks }: { tracks: SceneTracks }): ClipSpan[][] {
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
