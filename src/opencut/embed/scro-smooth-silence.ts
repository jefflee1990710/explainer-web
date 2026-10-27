"use client";

import { useSyncExternalStore } from "react";
import type { EditorCore } from "@/opencut/core";
import {
	createMediaInputSource,
	probeVideoSpeechBoundsFromSource,
} from "@/opencut/embed/scro-media-load";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import {
	getScroSmoothSilenceEnabled,
	naturalSpeechTrim,
	nextPackedStartSeconds,
	setScroSmoothSilenceEnabled,
	subscribeScroSmoothSilence,
	syncAutoSmoothSilence,
} from "@/opencut/embed/scro-smooth-silence-pack";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";

export {
	getScroSmoothSilenceEnabled,
	setScroSmoothSilenceEnabled,
	subscribeScroSmoothSilence,
	syncAutoSmoothSilence,
};

// Reactive hook for the Smooth Silence toggle state in the top toolbar.
export function useScroSmoothSilenceEnabled(): boolean {
	return useSyncExternalStore(
		subscribeScroSmoothSilence,
		getScroSmoothSilenceEnabled,
		() => false,
	);
}

/**
 * Trim leading/trailing speech silence on main-track video clips and pack them
 * with a short natural pause so talking-head cuts do not feel rushed.
 */
export async function runSmoothSilenceGapsOnTimeline({
	editor,
	pushHistory = true,
}: {
	editor: EditorCore;
	pushHistory?: boolean;
}): Promise<{ trimmedClipsCount: number; error?: string }> {
	const scene = editor.scenes.getActiveScene();
	const mainElements = [...scene.tracks.main.elements].sort(
		(a, b) => a.startTime - b.startTime,
	);
	const videoCount = mainElements.filter((el) => el.type === "video").length;
	if (videoCount === 0) {
		return { trimmedClipsCount: 0, error: "主軌道尚無影片片段" };
	}

	const mediaIdCounts = new Map<string, number>();
	for (const el of mainElements) {
		if (el.type === "video") {
			mediaIdCounts.set(el.mediaId, (mediaIdCounts.get(el.mediaId) ?? 0) + 1);
		}
	}

	const assets = editor.media.getAssets();
	const byId = new Map(assets.map((a) => [a.id, a]));
	const trimBoundsByAssetId = new Map<
		string,
		{ duration: number; trimStart: number; trimEnd: number }
	>();

	for (const el of mainElements) {
		if (el.type !== "video" || trimBoundsByAssetId.has(el.mediaId)) continue;
		const asset = byId.get(el.mediaId);
		if (!asset) continue;
		if (
			asset.duration &&
			(asset.speechTrimStart !== undefined || asset.speechTrimEnd !== undefined)
		) {
			trimBoundsByAssetId.set(asset.id, {
				duration: asset.duration,
				trimStart: asset.speechTrimStart ?? 0,
				trimEnd: asset.speechTrimEnd ?? 0,
			});
			continue;
		}
		const probed = await probeVideoSpeechBoundsFromSource(
			createMediaInputSource({ file: asset.file, url: asset.url }),
		);
		const dur =
			probed.duration ??
			asset.duration ??
			mediaTimeToSeconds({ time: el.duration });
		asset.speechTrimStart = probed.speechTrimStart ?? 0;
		asset.speechTrimEnd = probed.speechTrimEnd ?? 0;
		if (!asset.duration && dur > 0) {
			asset.duration = dur;
		}
		trimBoundsByAssetId.set(asset.id, {
			duration: dur,
			trimStart: probed.speechTrimStart ?? 0,
			trimEnd: probed.speechTrimEnd ?? 0,
		});
	}

	let cursorSeconds = 0;
	let trimmedClipsCount = 0;
	const updates: Array<{
		trackId: string;
		elementId: string;
		patch: Record<string, unknown>;
	}> = [];
	const lastVideoIndex = mainElements.findLastIndex((el) => el.type === "video");

	for (const [index, el] of mainElements.entries()) {
		if (el.type === "video" && (mediaIdCounts.get(el.mediaId) ?? 0) === 1) {
			const bounds = trimBoundsByAssetId.get(el.mediaId);
			if (bounds && bounds.duration > 0) {
				const { trimStart, trimEnd, visible } = naturalSpeechTrim(bounds);
				const trimmed = trimStart > 0.04 || trimEnd > 0.04;
				if (trimmed) trimmedClipsCount++;
				updates.push({
					trackId: scene.tracks.main.id,
					elementId: el.id,
					patch: {
						startTime: mediaTimeFromSeconds({ seconds: cursorSeconds }),
						duration: mediaTimeFromSeconds({ seconds: visible }),
						trimStart: mediaTimeFromSeconds({ seconds: trimStart }),
						trimEnd: mediaTimeFromSeconds({ seconds: trimEnd }),
						sourceDuration: mediaTimeFromSeconds({ seconds: bounds.duration }),
					},
				});
				// A file the server already trimmed has no extra dead air, so do not
				// insert another pause on top of the breath kept in the MP4.
				cursorSeconds = nextPackedStartSeconds(
					cursorSeconds,
					visible,
					index === lastVideoIndex || !trimmed,
				);
				continue;
			}
		}
		const durSec = mediaTimeToSeconds({ time: el.duration });
		updates.push({
			trackId: scene.tracks.main.id,
			elementId: el.id,
			patch: {
				startTime: mediaTimeFromSeconds({ seconds: cursorSeconds }),
			},
		});
		cursorSeconds += durSec;
	}

	if (updates.length > 0) {
		editor.timeline.updateElements({
			pushHistory,
			updates,
		});
		armScroSync();
	}

	return { trimmedClipsCount };
}

/**
 * Restore main-track video clips to their full untrimmed durations and pack them
 * back-to-back without silence trimming when the Smooth Silence toggle is turned off.
 */
export async function runRestoreSilenceGapsOnTimeline({
	editor,
	pushHistory = true,
}: {
	editor: EditorCore;
	pushHistory?: boolean;
}): Promise<{ restoredClipsCount: number; error?: string }> {
	const scene = editor.scenes.getActiveScene();
	const mainElements = [...scene.tracks.main.elements].sort(
		(a, b) => a.startTime - b.startTime,
	);
	const videoCount = mainElements.filter((el) => el.type === "video").length;
	if (videoCount === 0) {
		return { restoredClipsCount: 0, error: "主軌道尚無影片片段" };
	}

	const mediaIdCounts = new Map<string, number>();
	for (const el of mainElements) {
		if (el.type === "video") {
			mediaIdCounts.set(el.mediaId, (mediaIdCounts.get(el.mediaId) ?? 0) + 1);
		}
	}

	const assets = editor.media.getAssets();
	const byId = new Map(assets.map((a) => [a.id, a]));

	let cursorSeconds = 0;
	let restoredClipsCount = 0;
	const updates: Array<{
		trackId: string;
		elementId: string;
		patch: Record<string, unknown>;
	}> = [];

	for (const el of mainElements) {
		if (el.type === "video" && (mediaIdCounts.get(el.mediaId) ?? 0) === 1) {
			const asset = byId.get(el.mediaId);
			const sourceSec =
				"sourceDuration" in el && el.sourceDuration != null
					? mediaTimeToSeconds({ time: el.sourceDuration })
					: 0;
			const curDur = mediaTimeToSeconds({ time: el.duration });
			const curTrimStart = mediaTimeToSeconds({ time: el.trimStart });
			const curTrimEnd = mediaTimeToSeconds({ time: el.trimEnd });
			const fullDuration =
				(asset?.duration && asset.duration > 0 ? asset.duration : 0) ||
				(sourceSec > 0 ? sourceSec : 0) ||
				Math.max(0.5, Math.round((curDur + curTrimStart + curTrimEnd) * 1000) / 1000);

			if (curTrimStart > 0.01 || curTrimEnd > 0.01 || Math.abs(curDur - fullDuration) > 0.02) {
				restoredClipsCount++;
			}

			updates.push({
				trackId: scene.tracks.main.id,
				elementId: el.id,
				patch: {
					startTime: mediaTimeFromSeconds({ seconds: cursorSeconds }),
					duration: mediaTimeFromSeconds({ seconds: fullDuration }),
					trimStart: mediaTimeFromSeconds({ seconds: 0 }),
					trimEnd: mediaTimeFromSeconds({ seconds: 0 }),
					sourceDuration: mediaTimeFromSeconds({ seconds: fullDuration }),
				},
			});
			cursorSeconds += fullDuration;
			continue;
		}
		const durSec = mediaTimeToSeconds({ time: el.duration });
		updates.push({
			trackId: scene.tracks.main.id,
			elementId: el.id,
			patch: {
				startTime: mediaTimeFromSeconds({ seconds: cursorSeconds }),
			},
		});
		cursorSeconds += durSec;
	}

	if (updates.length > 0) {
		editor.timeline.updateElements({
			pushHistory,
			updates,
		});
		armScroSync();
	}

	return { restoredClipsCount };
}
