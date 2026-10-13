"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { toElementDurationTicks } from "@/timeline/creation";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/wasm";
import { armScroSync, readSeen, rememberClipSource, writeSeen } from "@/embed/scro-media-sources";
import { isScroEmbed, listenFromScro, sendToScro } from "@/embed/scro-transport";

// Scro's Video tab sends finished clips into this editor.
const PARENT_ORIGINS = new Set([
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"https://www.scro.io",
	"https://scro.io",
]);

const CANVAS = {
	"9:16": { width: 1080, height: 1920 },
	"16:9": { width: 1920, height: 1080 },
	"1:1": { width: 1080, height: 1080 },
} as const;

type ScroClip = { name: string; url: string };

type ScroImportMessage = {
	type: "scro-import-clips";
	videoId: string;
	aspectRatio?: keyof typeof CANVAS;
	clips: ScroClip[];
};

export function ScroClipImport() {
	const editor = useEditor();
	const busy = useRef(false);

	useEffect(() => {
		if (!isScroEmbed()) return;

		const stop = listenFromScro((payload) => {
			const data = payload as ScroImportMessage;
			if (!data || data.type !== "scro-import-clips" || !data.videoId) return;
			void importClips(data);
		}, PARENT_ORIGINS);
		const parentOrigin = document.referrer
			? new URL(document.referrer).origin
			: window.location.origin;
		sendToScro({ type: "scro-editor-ready" }, parentOrigin);

		return stop;

		async function importClips(data: ScroImportMessage) {
			if (busy.current) return;
			const project = editor.project.getActiveOrNull();
			if (!project) return;

			const seen = readSeen(data.videoId);
			const fresh = data.clips.filter((clip) => clip.url && !seen.has(clip.url));
			const size = data.aspectRatio ? CANVAS[data.aspectRatio] : undefined;
			if (size && seen.size === 0) {
				await editor.project.updateSettings({
					settings: { canvasSize: size, canvasSizeMode: "preset" },
					pushHistory: false,
				});
			}
			if (fresh.length === 0) {
				armScroSync();
				return;
			}

			busy.current = true;
			try {
				let cursor = mainEndSeconds();
				for (const clip of fresh) {
					const response = await fetch(clip.url);
					if (!response.ok) continue;
					const blob = await response.blob();
					const file = new File([blob], `${clip.name}.mp4`, {
						type: blob.type || "video/mp4",
					});
					const processed = await processMediaAssets({ files: [file] });
					const asset = processed[0];
					if (!asset) continue;
					const created = await editor.media.addMediaAsset({
						projectId: project.metadata.id,
						asset,
					});
					if (!created) continue;
					rememberClipSource(data.videoId, created.id, clip.url);
					const duration = toElementDurationTicks({ seconds: created.duration });
					const scene = editor.scenes.getActiveScene();
					editor.timeline.insertElement({
						placement: { mode: "explicit", trackId: scene.tracks.main.id },
						element: buildElementFromMedia({
							mediaId: created.id,
							mediaType: created.type,
							name: created.name,
							duration,
							startTime: mediaTimeFromSeconds({ seconds: cursor }),
						}),
					});
					cursor += created.duration ?? 5;
					seen.add(clip.url);
					writeSeen(data.videoId, seen);
				}
			} finally {
				busy.current = false;
				armScroSync();
			}
		}

		function mainEndSeconds() {
			const scene = editor.scenes.getActiveScene();
			let end = 0;
			for (const element of scene.tracks.main.elements) {
				const start = mediaTimeToSeconds({ time: element.startTime });
				const duration = mediaTimeToSeconds({ time: element.duration });
				end = Math.max(end, start + duration);
			}
			return end;
		}
	}, [editor]);

	return null;
}
