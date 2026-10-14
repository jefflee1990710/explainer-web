"use client";

import { useSyncExternalStore } from "react";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

export type ScroVideoStoreState = {
	videoId: string;
	clips: ScroVideoSeedClip[];
	/** Assets/Properties selection when the clip is not on the timeline. */
	selectedClipNumber: number | null;
};

let state: ScroVideoStoreState | null = null;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function setScroVideos({
	videoId,
	clips,
}: {
	videoId: string;
	clips: ScroVideoSeedClip[];
}): void {
	state = {
		videoId,
		clips,
		selectedClipNumber: state?.videoId === videoId ? state.selectedClipNumber : null,
	};
	emit();
}

export function setScroVideoSelection(clipNumber: number | null): void {
	if (!state) return;
	state = { ...state, selectedClipNumber: clipNumber };
	emit();
}

export function getScroVideos(): ScroVideoStoreState | null {
	return state;
}

export function useScroVideos(): ScroVideoStoreState | null {
	return useSyncExternalStore(subscribe, getScroVideos, () => null);
}
