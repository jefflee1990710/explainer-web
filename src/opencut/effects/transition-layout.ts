import { registerDefaultEffects } from "@/opencut/effects/definitions";
import { effectsRegistry } from "@/opencut/effects/registry";
import type { TimelineElement, TimelineTrack } from "@/opencut/timeline";

/** True when this catalog effect is a transition (clip head, tail, or cut). */
export function isTransitionEffectType(effectType: string): boolean {
	registerDefaultEffects();
	if (!effectsRegistry.has(effectType)) return false;
	return (effectsRegistry.get(effectType).category ?? "effect") === "transition";
}

export function isTransitionElement(element: TimelineElement): boolean {
	return element.type === "effect" && isTransitionEffectType(element.effectType);
}

/** Effect rows that only hold transitions are drawn on the video row instead. */
export function isTransitionOnlyTrack(track: TimelineTrack): boolean {
	if (track.type !== "effect" || track.elements.length === 0) return false;
	return track.elements.every((element) => isTransitionElement(element));
}

export function visibleTimelineTracks(tracks: TimelineTrack[]): TimelineTrack[] {
	return tracks.filter((track) => !isTransitionOnlyTrack(track));
}

/** True when this transition covers any clip on the video row. */
export function transitionOverlapsTrack({
	element,
	track,
}: {
	element: TimelineElement;
	track: TimelineTrack;
}): boolean {
	if (track.type !== "video") return false;
	const start = element.startTime;
	const end = start + element.duration;
	return track.elements.some((clip) => {
		const clipEnd = clip.startTime + clip.duration;
		return start < clipEnd && end > clip.startTime;
	});
}

/** Transition blocks to paint on top of a video row. */
export function transitionOverlayElements({
	tracks,
}: {
	tracks: TimelineTrack[];
}): Array<{ element: TimelineElement; track: TimelineTrack }> {
	const overlays: Array<{ element: TimelineElement; track: TimelineTrack }> = [];
	for (const track of tracks) {
		if (track.type !== "effect") continue;
		for (const element of track.elements) {
			if (!isTransitionElement(element)) continue;
			overlays.push({ element, track });
		}
	}
	return overlays;
}
