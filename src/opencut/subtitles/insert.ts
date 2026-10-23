import type { EditorCore } from "@/opencut/core";
import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
} from "@/opencut/commands";
import { buildSubtitleTextElement } from "./build-subtitle-text-element";
import type { SubtitleCue } from "./types";

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
	const reusableTrack = scene.tracks.overlay.find(
		(track) => track.type === "text" && track.elements.length === 0,
	);
	const addTrackCommand = reusableTrack
		? null
		: new AddTrackCommand({ type: "text", index: 0 });
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
