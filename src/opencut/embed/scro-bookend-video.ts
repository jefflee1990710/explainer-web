import type { EditorCore } from "@/opencut/core";
import { createStreamingVideoAsset } from "@/opencut/embed/scro-media-load";
import type { MediaAsset } from "@/opencut/media/types";
import { armScroSync, rememberClipSource } from "@/opencut/embed/scro-media-sources";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { findNonOverlappingMainTrackStartTime } from "@/opencut/timeline/placement";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	type MediaTime,
	ZERO_MEDIA_TIME,
} from "@/opencut/wasm";

export type BookendPlacementRole = "opening" | "ending";

const bookendDownloads = new Map<string, Promise<MediaAsset | null>>();

/** Download an Opening or Ending mp4 once and keep it in the library. */
export function ensureBookendVideo(
	args: {
		editor: EditorCore;
		editorVideoId: string;
		url: string;
		name: string;
		posterUrl?: string;
		fallbackDuration?: number;
	},
): Promise<MediaAsset | null> {
	const key = `${args.editorVideoId}:${args.url}`;
	const pending = bookendDownloads.get(key);
	if (pending) return pending;
	const job = downloadBookendVideo(args).finally(() => {
		bookendDownloads.delete(key);
	});
	bookendDownloads.set(key, job);
	return job;
}

async function downloadBookendVideo({
	editor,
	editorVideoId,
	url,
	name,
	posterUrl,
	fallbackDuration,
}: {
	editor: EditorCore;
	editorVideoId: string;
	url: string;
	name: string;
	posterUrl?: string;
	fallbackDuration?: number;
}): Promise<MediaAsset | null> {
	const project = editor.project.getActiveOrNull();
	if (!project) return null;
	const existing = editor.media.getAssets().find(
		(asset) =>
			asset.type === "video" &&
			(asset.scroPosterUrl === url || asset.name === name),
	);
	if (existing) return existing;
	const asset = await createStreamingVideoAsset({
		url,
		name,
		posterUrl,
		fallbackDuration: fallbackDuration && fallbackDuration > 0 ? fallbackDuration : 4,
	});
	const created = await editor.media.addMediaAsset({
		projectId: project.metadata.id,
		asset: {
			...asset,
			name,
			scroPosterUrl: url,
			thumbnailUrl: posterUrl ?? asset.thumbnailUrl,
		},
	});
	if (created) rememberClipSource(editorVideoId, created.id, url);
	return created;
}

/** Place an Opening or Ending on the main video track (Opening prepends at 0s and ripples main-track clips; Ending appends or drops without overlap). */
export async function addBookendVideoToTimeline({
	editor,
	editorVideoId,
	url,
	name,
	posterUrl,
	startTime,
	role,
	durationSeconds,
}: {
	editor: EditorCore;
	editorVideoId: string;
	url: string;
	name: string;
	posterUrl?: string;
	startTime: MediaTime;
	role?: BookendPlacementRole;
	durationSeconds?: number;
}): Promise<MediaAsset | null> {
	const asset = await ensureBookendVideo({
		editor,
		editorVideoId,
		url,
		name,
		posterUrl,
		fallbackDuration: durationSeconds,
	});
	if (!asset) return null;
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return null;
	const seconds =
		asset.duration && asset.duration > 0
			? asset.duration
			: durationSeconds && durationSeconds > 0
				? durationSeconds
				: 4;
	const duration = mediaTimeFromSeconds({ seconds });

	const startSec = mediaTimeToSeconds({ time: startTime });
	const prependOpening =
		role === "opening" &&
		(startSec <= 0.5 ||
			scene.tracks.main.elements.some(
				(el) =>
					el.startTime < startTime + duration &&
					el.startTime + el.duration > startTime,
			));

	if (prependOpening && scene.tracks.main.elements.length > 0) {
		editor.timeline.updateElements({
			updates: scene.tracks.main.elements.map((el) => ({
				trackId: scene.tracks.main.id,
				elementId: el.id,
				patch: {
					startTime: mediaTimeFromSeconds({
						seconds: mediaTimeToSeconds({ time: el.startTime }) + seconds,
					}),
				},
			})),
		});
		editor.timeline.insertElement({
			placement: { mode: "explicit", trackId: scene.tracks.main.id },
			element: buildElementFromMedia({
				mediaId: asset.id,
				mediaType: "video",
				name,
				duration,
				startTime: ZERO_MEDIA_TIME,
			}),
		});
		editor.playback.seek({ time: ZERO_MEDIA_TIME });
		armScroSync();
		return asset;
	}

	const freshScene = editor.scenes.getActiveScene();
	const resolvedStart = findNonOverlappingMainTrackStartTime({
		mainTrack: freshScene.tracks.main,
		requestedStartTime: startTime,
		duration,
	});
	editor.timeline.insertElement({
		placement: { mode: "explicit", trackId: freshScene.tracks.main.id },
		element: buildElementFromMedia({
			mediaId: asset.id,
			mediaType: "video",
			name,
			duration,
			startTime: resolvedStart,
		}),
	});
	editor.playback.seek({ time: resolvedStart });
	armScroSync();
	return asset;
}
