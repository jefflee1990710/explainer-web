"use client";

import { useSyncExternalStore } from "react";

export type ScroOnscreenTextStage =
	| "queued"
	| "in_progress"
	| "completed"
	| "failed";

// First-class asset object for AI-generated on-screen text images (sibling of ScroVideo).
export type ScroOnscreenText = {
	id: string;
	text: string;
	textStyleId: string;
	styleName?: string;
	status: ScroOnscreenTextStage;
	url?: string;
	error?: string;
	submittedAt?: string;
};

let currentVideoId: string | null = null;
let itemsState: ScroOnscreenText[] = [];
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getScroOnscreenTexts(): ScroOnscreenText[] {
	return itemsState;
}

export function useScroOnscreenTexts(): ScroOnscreenText[] {
	return useSyncExternalStore(subscribe, getScroOnscreenTexts, () => []);
}

export function setScroOnscreenTexts({
	videoId,
	items,
}: {
	videoId: string;
	items: ScroOnscreenText[];
}): void {
	if (currentVideoId !== videoId) {
		currentVideoId = videoId;
		itemsState = [...items];
		emit();
		return;
	}
	// Preserve any optimistic local item (`temp_*`) that hasn't been replaced yet.
	const optimistic = itemsState.filter(
		(item) => item.id.startsWith("temp_") && !items.some((s) => s.id === item.id),
	);
	itemsState = [...optimistic, ...items];
	emit();
}

export function upsertScroOnscreenText(item: ScroOnscreenText): void {
	const index = itemsState.findIndex((existing) => existing.id === item.id);
	if (index < 0) {
		itemsState = [item, ...itemsState];
	} else {
		itemsState = itemsState.map((existing) =>
			existing.id === item.id ? item : existing,
		);
	}
	emit();
}

export function removeScroOnscreenText(id: string): void {
	itemsState = itemsState.filter((existing) => existing.id !== id);
	emit();
}

export function replaceOptimisticScroOnscreenTextInStore({
	tempId,
	realItem,
}: {
	tempId: string;
	realItem: ScroOnscreenText;
}): void {
	itemsState = [
		realItem,
		...itemsState.filter((entry) => entry.id !== tempId && entry.id !== realItem.id),
	];
	emit();
}

export function scroOnscreenTextDisplayName(text: string): string {
	const clean = text.replace(/\s+/g, " ").trim().slice(0, 32) || "On-Screen Text";
	return `ScroOnscreenText · ${clean}`;
}
