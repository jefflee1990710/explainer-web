import { nonOverlappingMainTrackStart } from "@/opencut/embed/scro-clip-duration";
import type { SceneTracks, TimelineElement, VideoTrack } from "@/opencut/timeline";
import { type MediaTime, ZERO_MEDIA_TIME } from "@/opencut/wasm";

export const MAIN_TRACK_NAME = "Main Track";

export function getEarliestMainTrackElement({
	mainTrack,
	excludeElementId,
}: {
	mainTrack: VideoTrack;
	excludeElementId?: string;
}): TimelineElement | null {
	const elements = mainTrack.elements.filter((element) => {
		return !excludeElementId || element.id !== excludeElementId;
	});
	if (elements.length === 0) {
		return null;
	}

	return elements.reduce((earliestElement, element) => {
		return element.startTime < earliestElement.startTime
			? element
			: earliestElement;
	});
}

export function enforceMainTrackStart({
	tracks,
	targetTrackId,
	requestedStartTime,
	excludeElementId,
}: {
	tracks: SceneTracks;
	targetTrackId: string;
	requestedStartTime: MediaTime;
	excludeElementId?: string;
}): MediaTime {
	if (tracks.main.id !== targetTrackId) {
		return requestedStartTime;
	}

	const earliestElement = getEarliestMainTrackElement({
		mainTrack: tracks.main,
		excludeElementId,
	});
	if (!earliestElement) {
		return ZERO_MEDIA_TIME;
	}

	if (requestedStartTime <= earliestElement.startTime) {
		return ZERO_MEDIA_TIME;
	}

	return requestedStartTime;
}

/**
 * Find the earliest start time on the main track at or after `requestedStartTime`
 * where a span of `duration` does not overlap any existing element.
 * When the main track is empty, returns `ZERO_MEDIA_TIME`.
 */
export function findNonOverlappingMainTrackStartTime({
	mainTrack,
	requestedStartTime,
	duration,
}: {
	mainTrack: Pick<VideoTrack, "elements">;
	requestedStartTime: MediaTime;
	duration: MediaTime;
}): MediaTime {
	return nonOverlappingMainTrackStart({
		spans: mainTrack.elements,
		requestedStart: requestedStartTime,
		duration,
	}) as MediaTime;
}
