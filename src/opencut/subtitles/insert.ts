import type { EditorCore } from "@/opencut/core";
import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
} from "@/opencut/commands";
import { buildSubtitleTextElement } from "./build-subtitle-text-element";
import type { SubtitleCue } from "./types";

export const SUBTITLE_TRACK_NAME = "Subtitles · 字幕圖層";

export function isSubtitleTrack({
	name,
	elements,
}: {
	name?: string;
	elements?: Array<{ name: string }>;
}): boolean {
	if (name && /subtitle|字幕/i.test(name)) return true;
	if (elements && elements.some((el) => /^Subtitle \d+(?:[.-]\d+)?$/.test(el.name))) {
		return true;
	}
	return false;
}

export function insertCaptionChunksAsTextTrack({
	editor,
	captions,
}: {
	editor: EditorCore;
	captions: SubtitleCue[];
}): string | null {
	if (captions.length === 0) {
		return null;
	}

	const scene = editor.scenes.getActiveScene();
	const reusableTrack =
		scene.tracks.overlay.find(
			(track) =>
				track.type === "text" &&
				isSubtitleTrack({ name: track.name, elements: track.elements }),
		) ??
		scene.tracks.overlay.find(
			(track) => track.type === "text" && track.elements.length === 0,
		);
	const addTrackCommand = reusableTrack
		? null
		: new AddTrackCommand({
				type: "text",
				index: 0,
				name: SUBTITLE_TRACK_NAME,
			});
	const trackId = reusableTrack
		? reusableTrack.id
		: addTrackCommand!.getTrackId();
	const canvasSize = editor.project.getActive().settings.canvasSize;
	const insertCommands = captions.map(
		(caption, index) =>
			new InsertElementCommand({
				placement: { mode: "explicit", trackId },
				element: buildSubtitleTextElement({
					index,
					caption,
					canvasSize,
				}),
			}),
	);
	editor.command.execute({
		command: new BatchCommand([
			...(addTrackCommand ? [addTrackCommand] : []),
			...insertCommands,
		]),
	});

	return trackId;
}
