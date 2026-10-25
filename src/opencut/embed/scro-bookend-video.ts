import type { EditorCore } from "@/opencut/core";
import { processMediaAssets } from "@/opencut/media/processing";
import type { MediaAsset } from "@/opencut/media/types";
import { rememberClipSource } from "@/opencut/embed/scro-media-sources";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { findNonOverlappingMainTrackStartTime } from "@/opencut/timeline/placement";
import { mediaTimeFromSeconds, type MediaTime } from "@/opencut/wasm";

const bookendDownloads = new Map<string, Promise<MediaAsset | null>>();

/** Download an Opening or Ending mp4 once and keep it in the library. */
export function ensureBookendVideo(
	args: {
		editor: EditorCore;
		editorVideoId: string;
		url: string;
		name: string;
		posterUrl?: string;
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
}: {
	editor: EditorCore;
	editorVideoId: string;
	url: string;
	name: string;
	posterUrl?: string;
}): Promise<MediaAsset | null> {
	const project = editor.project.getActiveOrNull();
	if (!project) return null;
	const existing = editor.media.getAssets().find(
		(asset) =>
			asset.type === "video" &&
			(asset.scroPosterUrl === url || asset.name === name),
	);
	if (existing) return existing;
	const response = await fetch(url);
	if (!response.ok) return null;
	const blob = await response.blob();
	const file = new File([blob], `${name}.mp4`, { type: blob.type || "video/mp4" });
	const processed = await processMediaAssets({ files: [file] });
	const asset = processed[0];
	if (!asset) return null;
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

/** Place an Opening or Ending on the main video track, after any clip it would overlap. */
export async function addBookendVideoToTimeline({
	editor,
	editorVideoId,
	url,
	name,
	posterUrl,
	startTime,
}: {
	editor: EditorCore;
	editorVideoId: string;
	url: string;
	name: string;
	posterUrl?: string;
	startTime: MediaTime;
}): Promise<MediaAsset | null> {
	const asset = await ensureBookendVideo({ editor, editorVideoId, url, name, posterUrl });
	if (!asset) return null;
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return null;
	const seconds = asset.duration && asset.duration > 0 ? asset.duration : 4;
	const duration = mediaTimeFromSeconds({ seconds });
	// The video row is already full of storyboard clips. Sit after them
	// instead of opening a second track or overlapping a clip.
	const resolvedStart = findNonOverlappingMainTrackStartTime({
		mainTrack: scene.tracks.main,
		requestedStartTime: startTime,
		duration,
	});
	editor.timeline.insertElement({
		placement: { mode: "explicit", trackId: scene.tracks.main.id },
		element: buildElementFromMedia({
			mediaId: asset.id,
			mediaType: "video",
			name,
			duration,
			startTime: resolvedStart,
		}),
	});
	editor.playback.seek({ time: resolvedStart });
	return asset;
}
