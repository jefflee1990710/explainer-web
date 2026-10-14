import type { EditorCore } from "@/opencut/core";
import { processMediaAssets } from "@/opencut/media/processing";
import type { MediaAsset } from "@/opencut/media/types";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { mediaTimeFromSeconds, type MediaTime } from "@/opencut/wasm";

/** Reuse a library image for this still, or download it once. */
export async function ensureFrameStill({
	editor,
	url,
	name,
}: {
	editor: EditorCore;
	url: string;
	name: string;
}): Promise<MediaAsset | null> {
	const project = editor.project.getActiveOrNull();
	if (!project) return null;
	const existing = editor.media.getAssets().find(
		(asset) =>
			asset.type === "image" && asset.scroPosterUrl === url && asset.name === name,
	);
	if (existing) return existing;
	const response = await fetch(url);
	if (!response.ok) return null;
	const blob = await response.blob();
	const file = new File([blob], `${name}.webp`, {
		type: blob.type || "image/webp",
	});
	const processed = await processMediaAssets({ files: [file] });
	const asset = processed[0];
	if (!asset) return null;
	return editor.media.addMediaAsset({
		projectId: project.metadata.id,
		asset: {
			...asset,
			name,
			scroPosterUrl: url,
			thumbnailUrl: url,
		},
	});
}

/** Place a start or end still on the timeline at the playhead. */
export async function addSceneFrameToTimeline({
	editor,
	url,
	name,
	durationSeconds,
	startTime,
}: {
	editor: EditorCore;
	url: string;
	name: string;
	durationSeconds: number;
	startTime: MediaTime;
}): Promise<MediaAsset | null> {
	const asset = await ensureFrameStill({ editor, url, name });
	if (!asset) return null;
	editor.timeline.insertElement({
		placement: { mode: "auto" },
		element: buildElementFromMedia({
			mediaId: asset.id,
			mediaType: "image",
			name,
			duration: mediaTimeFromSeconds({ seconds: durationSeconds }),
			startTime,
		}),
	});
	return asset;
}
