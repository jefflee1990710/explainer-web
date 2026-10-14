"use client";

import { useSyncExternalStore } from "react";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

export type ScroVideoStoreState = {
	videoId: string;
	clips: ScroVideoSeedClip[];
	/** Assets/Properties selection when the clip is not on the timeline. */
	selectedClipNumber: number | null;
	/** Multi-select for bulk generate. */
	checkedClipNumbers: number[];
};

export type ScroClipMenuFlags = {
	/** No bulk job is running, so clip actions can open. */
	idle: boolean;
	/** Every frame is ready, so All videos can run. */
	videosEnabled: boolean;
};

let state: ScroVideoStoreState | null = null;
let menuFlags: ScroClipMenuFlags = { idle: true, videosEnabled: false };
/** Click that arrived before the storyboard store was filled. */
let pendingClipNumber: number | null = null;
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
	const keepSelection =
		state?.videoId === videoId ? state.selectedClipNumber : pendingClipNumber;
	const clipSet = new Set(clips.map((clip) => clip.clipNumber));
	const checked =
		state?.videoId === videoId
			? state.checkedClipNumbers.filter((n) => clipSet.has(n))
			: [];
	state = {
		videoId,
		clips,
		selectedClipNumber:
			keepSelection != null && clipSet.has(keepSelection) ? keepSelection : null,
		checkedClipNumbers: checked,
	};
	pendingClipNumber = state.selectedClipNumber;
	emit();
}

export function setScroVideoSelection(clipNumber: number | null): void {
	pendingClipNumber = clipNumber;
	if (!state) return;
	state = { ...state, selectedClipNumber: clipNumber };
	emit();
}

export function toggleScroVideoChecked(clipNumber: number): void {
	if (!state) return;
	const has = state.checkedClipNumbers.includes(clipNumber);
	state = {
		...state,
		checkedClipNumbers: has
			? state.checkedClipNumbers.filter((n) => n !== clipNumber)
			: [...state.checkedClipNumbers, clipNumber].sort((a, b) => a - b),
	};
	emit();
}

export function setScroClipMenuFlags(flags: ScroClipMenuFlags): void {
	menuFlags = flags;
	emit();
}

export function getScroClipMenuFlags(): ScroClipMenuFlags {
	return menuFlags;
}

export function useScroClipMenuFlags(): ScroClipMenuFlags {
	return useSyncExternalStore(subscribe, getScroClipMenuFlags, () => menuFlags);
}

export function clearScroVideoChecked(): void {
	if (!state) return;
	state = { ...state, checkedClipNumbers: [] };
	emit();
}

export function getScroVideos(): ScroVideoStoreState | null {
	return state;
}

export function subscribeScroVideos(fn: () => void): () => void {
	return subscribe(fn);
}

export function useScroVideos(): ScroVideoStoreState | null {
	return useSyncExternalStore(subscribe, getScroVideos, () => null);
}
