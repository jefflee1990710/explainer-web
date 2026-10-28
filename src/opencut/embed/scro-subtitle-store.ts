"use client";

import { useSyncExternalStore } from "react";

// Matches the catalog the Scro parent posts. The iframe cannot import the parent package.
export type ScroSubtitleStyle = {
	id: string;
	name: string;
	previewUrl: string;
	drawLook: string;
};

export type ScroSubtitleLine = {
	clipNumber: number;
	line: string;
};

export type ScroSubtitleUi = {
	subtitles: string;
	hint: string;
	generate: string;
	generating: string;
	placed: string;
	placedPartial: string;
	noLines: string;
	noMatch: string;
};

export type ScroSubtitleCatalog = {
	styles: ScroSubtitleStyle[];
	lines: ScroSubtitleLine[];
	selectedId: string;
	ui: ScroSubtitleUi;
};

let open = false;
let catalog: ScroSubtitleCatalog | null = null;
let videoId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useScroSubtitleOpen() {
	return useSyncExternalStore(
		subscribe,
		() => open,
		() => false,
	);
}

export function useScroSubtitleCatalog() {
	return useSyncExternalStore(
		subscribe,
		() => catalog,
		() => null,
	);
}

export function useScroSubtitleVideoId() {
	return useSyncExternalStore(
		subscribe,
		() => videoId,
		() => null,
	);
}

export function setScroSubtitleOpen(next: boolean) {
	if (open === next) return;
	open = next;
	emit();
}

export function getScroSubtitleCatalog(): ScroSubtitleCatalog | null {
	return catalog;
}

export function setScroSubtitleCatalog(next: ScroSubtitleCatalog) {
	catalog = next;
	emit();
}

export function setScroSubtitleVideoId(next: string) {
	if (videoId === next) return;
	videoId = next;
	emit();
}
