"use client";

import type { EditorCore } from "@/opencut/core";
import {
	createMediaInputSource,
	probeVideoSpeechBoundsFromSource,
} from "@/opencut/embed/scro-media-load";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";

/**
 * Trim leading/trailing speech silence on main-track video clips and pack them
 * back-to-back so clip junctions don't stack dead air.
 */
export async function runSmoothSilenceGapsOnTimeline({
	editor,
}: {
	editor: EditorCore;
}): Promise<{ trimmedClipsCount: number; error?: string }> {
	const scene = editor.scenes.getActiveScene();
	const mainElements = [...scene.tracks.main.elements].sort(
		(a, b) => a.startTime - b.startTime,
	);
	const videoCount = mainElements.filter((el) => el.type === "video").length;
	if (videoCount === 0) {
		return { trimmedClipsCount: 0, error: "主軌道尚無影片片段" };
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

	for (const el of mainElements) {
		if (el.type === "video") {
			const bounds = trimBoundsByAssetId.get(el.mediaId);
			if (bounds && bounds.duration > 0) {
				const trimStart = Math.max(
					0,
					Math.min(bounds.duration - 0.5, bounds.trimStart),
				);
				const trimEnd = Math.max(
					0,
					Math.min(bounds.duration - trimStart - 0.5, bounds.trimEnd),
				);
				const visible = Math.max(
					0.5,
					Math.round((bounds.duration - trimStart - trimEnd) * 1000) / 1000,
				);
				if (trimStart > 0.04 || trimEnd > 0.04) {
					trimmedClipsCount++;
				}
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
				cursorSeconds += visible;
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
			pushHistory: true,
			updates,
		});
		armScroSync();
	}

	return { trimmedClipsCount };
}
