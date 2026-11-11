"use client";

import { useSyncExternalStore } from "react";
import {
	AI_BGM_NAME_PREFIX,
	AI_SFX_NAME_PREFIX,
} from "@/service/opencut/auto-audio-shared";

/** Which auto-audio lane is generating: SFX or BGM. */
export type AutoAudioLane = "sfx" | "bgm";

type BusyState = Record<AutoAudioLane, boolean>;

let state: BusyState = { sfx: false, bgm: false };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Mark one lane busy so the matching timeline row can show a loader. */
export function setAutoAudioLaneBusy(lane: AutoAudioLane, busy: boolean) {
	if (state[lane] === busy) return;
	state = { ...state, [lane]: busy };
	for (const listener of listeners) listener();
}

export function useAutoAudioBusy(): BusyState {
	return useSyncExternalStore(
		subscribe,
		() => state,
		() => state,
	);
}

/** Named audio rows created for AI SFX and AI BGM. */
export function autoAudioLaneForTrack(track: {
	type: string;
	name: string;
}): AutoAudioLane | null {
	if (track.type !== "audio") return null;
	if (track.name === AI_SFX_NAME_PREFIX) return "sfx";
	if (track.name === AI_BGM_NAME_PREFIX) return "bgm";
	return null;
}
