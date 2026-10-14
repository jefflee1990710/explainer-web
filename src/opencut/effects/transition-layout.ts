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

/** Transition blocks to paint on top of the main video row. */
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
