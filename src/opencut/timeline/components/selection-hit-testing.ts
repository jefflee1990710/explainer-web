import {
	isTransitionElement,
	isTransitionOnlyTrack,
} from "@/opencut/effects/transition-layout";
import type { TimelineElement, TimelineTrack } from "@/opencut/timeline";
import { timelineTimeToPixels } from "@/opencut/timeline/pixel-utils";
import {
	TIMELINE_CONTENT_TOP_PADDING_PX,
	TIMELINE_TRACK_GAP_PX,
} from "./layout";
import { getTrackHeight } from "./track-layout";

type TimelineElementRef = { trackId: string; elementId: string };

interface SelectionRectangle {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

function getNormalizedRectangle({
	startPos,
	endPos,
}: {
	startPos: { x: number; y: number };
	endPos: { x: number; y: number };
}): SelectionRectangle {
	return {
		left: Math.min(startPos.x, endPos.x),
		top: Math.min(startPos.y, endPos.y),
		right: Math.max(startPos.x, endPos.x),
		bottom: Math.max(startPos.y, endPos.y),
	};
}

function getSelectionRectangleInContent({
	container,
	scrollContainer,
	startPos,
	endPos,
}: {
	container: HTMLElement;
	scrollContainer: HTMLDivElement | null;
	startPos: { x: number; y: number };
	endPos: { x: number; y: number };
}): SelectionRectangle {
	const containerRect = container.getBoundingClientRect();
	const scrollRect = scrollContainer?.getBoundingClientRect() ?? containerRect;
	const scrollLeft = scrollContainer?.scrollLeft ?? 0;
	const scrollTop = scrollContainer?.scrollTop ?? 0;

	const adjustedStart = {
		x: startPos.x - containerRect.left + scrollLeft,
		y: startPos.y - scrollRect.top + scrollTop,
	};
	const adjustedEnd = {
		x: endPos.x - containerRect.left + scrollLeft,
		y: endPos.y - scrollRect.top + scrollTop,
	};

	return getNormalizedRectangle({
		startPos: adjustedStart,
		endPos: adjustedEnd,
	});
}

function isRectangleIntersecting({
	elementRectangle,
	selectionRectangle,
}: {
	elementRectangle: SelectionRectangle;
	selectionRectangle: SelectionRectangle;
}): boolean {
	return !(
		elementRectangle.right < selectionRectangle.left ||
		elementRectangle.left > selectionRectangle.right ||
		elementRectangle.bottom < selectionRectangle.top ||
		elementRectangle.top > selectionRectangle.bottom
	);
}

export function resolveTimelineElementIntersections({
	container,
	scrollContainer,
	tracks,
	zoomLevel,
	startPos,
	currentPos,
}: {
	container: HTMLElement;
	scrollContainer: HTMLDivElement | null;
	tracks: TimelineTrack[];
	zoomLevel: number;
	startPos: { x: number; y: number };
	currentPos: { x: number; y: number };
}): TimelineElementRef[] {
	const selectionRectangle = getSelectionRectangleInContent({
		container,
		scrollContainer,
		startPos,
		endPos: currentPos,
	});
	const selectedElements: TimelineElementRef[] = [];
	const transitionHits: Array<{ trackId: string; element: TimelineElement }> = [];
	let cursor = 0;
	let mainBandTop: number | null = null;

	for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
		const track = tracks[trackIndex];
		if (isTransitionOnlyTrack(track)) {
			for (const element of track.elements) {
				transitionHits.push({ trackId: track.id, element });
			}
			continue;
		}

		const trackHeight = getTrackHeight({ type: track.type });
		const elementTop = TIMELINE_CONTENT_TOP_PADDING_PX + cursor;
		if (track.type === "video") mainBandTop = elementTop;

		for (const element of track.elements) {
			if (isTransitionElement(element)) {
				transitionHits.push({ trackId: track.id, element });
				continue;
			}
			pushIfHit({
				selectedElements,
				selectionRectangle,
				trackId: track.id,
				element,
				top: elementTop,
				bottom: elementTop + trackHeight,
				zoomLevel,
			});
		}

		const hasLaterVisible = tracks
			.slice(trackIndex + 1)
			.some((item) => !isTransitionOnlyTrack(item));
		cursor += trackHeight + (hasLaterVisible ? TIMELINE_TRACK_GAP_PX : 0);
	}

	if (mainBandTop !== null) {
		const barHeight = getTrackHeight({ type: "effect" });
		for (const hit of transitionHits) {
			pushIfHit({
				selectedElements,
				selectionRectangle,
				trackId: hit.trackId,
				element: hit.element,
				top: mainBandTop,
				bottom: mainBandTop + barHeight,
				zoomLevel,
			});
		}
	}

	return selectedElements;
}

function pushIfHit({
	selectedElements,
	selectionRectangle,
	trackId,
	element,
	top,
	bottom,
	zoomLevel,
}: {
	selectedElements: TimelineElementRef[];
	selectionRectangle: SelectionRectangle;
	trackId: string;
	element: TimelineElement;
	top: number;
	bottom: number;
	zoomLevel: number;
}): void {
	const elementLeft = timelineTimeToPixels({ time: element.startTime, zoomLevel });
	const elementRight = timelineTimeToPixels({
		time: element.startTime + element.duration,
		zoomLevel,
	});
	if (
		!isRectangleIntersecting({
			elementRectangle: {
				left: elementLeft,
				top,
				right: elementRight,
				bottom,
			},
			selectionRectangle,
		})
	) {
		return;
	}
	selectedElements.push({ trackId, elementId: element.id });
}
