import { listApplyAllTransitionSlots } from "@/opencut/effects/clip-anchor";
import { isTransitionElement } from "@/opencut/effects/transition-layout";
import { applyPlacement, getDefaultInsertIndexForTrack } from "@/opencut/timeline/placement";
import { buildEffectElement } from "@/opencut/timeline/element-utils";
import type { EffectElement, OverlayTrack, SceneTracks } from "@/opencut/timeline";
import { generateUUID } from "@/opencut/utils/id";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";

/** Drop existing transitions, then place this one on every cut and the ending. */
export function tracksWithTransitionOnAllCuts({
	tracks,
	effectType,
}: {
	tracks: SceneTracks;
	effectType: string;
}): SceneTracks | null {
	const slots = listApplyAllTransitionSlots(
		tracks.main.elements.map((element) => {
			const start = mediaTimeToSeconds({ time: element.startTime });
			return {
				start,
				end: start + mediaTimeToSeconds({ time: element.duration }),
			};
		}),
	);
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
