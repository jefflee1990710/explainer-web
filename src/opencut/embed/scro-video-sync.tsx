"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { processMediaAssets } from "@/opencut/media/processing";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { toElementDurationTicks } from "@/opencut/timeline/creation";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";
import {
	armScroSync,
	rememberClipSource,
} from "@/opencut/embed/scro-media-sources";
import { isScroEmbed, listenFromScro, sendToScro } from "@/opencut/embed/scro-transport";
import type {
	ScroClipUpdatedMessage,
	ScroSeedMessage,
	ScroVideoSeedClip,
	ScroVideosStateMessage,
} from "@/opencut/embed/scro-video-types";
import {
	clearScroVideoChecked,
	getScroVideos,
	setScroVideos,
} from "@/opencut/embed/scro-video-store";
import type { TimelineElement } from "@/opencut/timeline";

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

// 1×1 gray PNG used when a clip has no start still yet.
function placeholderFile(name: string): File {
	const bytes = Uint8Array.from(
		atob(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
		),
		(char) => char.charCodeAt(0),
	);
	return new File([bytes], name, { type: "image/png" });
}

function mainHasScroClip(elements: TimelineElement[]) {
	return elements.some(
		(element) =>
			(element.type === "video" || element.type === "image") &&
			element.scroClipNumber != null,
	);
}

/** Replace one clip, or append it when the list was only partially filled. */
function upsertScroClip({
	clips,
	clip,
}: {
	clips: ScroVideoSeedClip[];
	clip: ScroVideoSeedClip;
}) {
	const index = clips.findIndex((item) => item.clipNumber === clip.clipNumber);
	if (index < 0) {
		return [...clips, clip].sort((a, b) => a.clipNumber - b.clipNumber);
	}
	return clips.map((item) => (item.clipNumber === clip.clipNumber ? clip : item));
}

function findScroElement(elements: TimelineElement[], clipNumber: number) {
	return elements.find(
		(element) =>
			(element.type === "video" || element.type === "image") &&
			element.scroClipNumber === clipNumber,
	);
}

/** Seeds and updates ScroVideo placeholders on the main track. */
export function ScroVideoSync() {
	const editor = useEditor();
	const busy = useRef(false);

	useEffect(() => {
		if (!isScroEmbed()) return;

		const stop = listenFromScro((payload) => {
			const data = payload as
				| ScroSeedMessage
				| ScroClipUpdatedMessage
				| ScroVideosStateMessage
				| { type: "scro-clear-checked"; videoId: string };
			if (!data || !("type" in data) || !data.videoId) return;
			if (data.type === "scro-seed-videos") {
				setScroVideos({ videoId: data.videoId, clips: data.clips });
				void seedClips(data);
				return;
			}
			if (data.type === "scro-videos-state") {
				setScroVideos({ videoId: data.videoId, clips: data.clips });
				void reconcileClips(data);
				return;
			}
			if (data.type === "scro-clear-checked") {
				clearScroVideoChecked();
				return;
			}
			if (data.type === "scro-clip-updated") {
				const current = getScroVideos();
				const nextClips =
					current?.videoId === data.videoId
						? upsertScroClip({ clips: current.clips, clip: data.clip })
						: [data.clip];
				setScroVideos({ videoId: data.videoId, clips: nextClips });
				void updateClip(data);
			}
		}, PARENT_ORIGINS);

		const parentOrigin = document.referrer
			? new URL(document.referrer).origin
			: window.location.origin;
		sendToScro({ type: "scro-editor-ready" }, parentOrigin);

		return stop;

		async function seedClips(data: ScroSeedMessage) {
			if (busy.current) return;
			const project = editor.project.getActiveOrNull();
			if (!project) return;
			const scene = editor.scenes.getActiveScene();
			if (mainHasScroClip(scene.tracks.main.elements)) {
				armScroSync();
				return;
			}

			const size = data.aspectRatio ? CANVAS[data.aspectRatio] : undefined;
			if (size) {
				await editor.project.updateSettings({
					settings: { canvasSize: size, canvasSizeMode: "preset" },
					pushHistory: false,
				});
			}

			busy.current = true;
			try {
				let cursor = 0;
				for (const clip of data.clips) {
					const created = await ensureMedia({ videoId: data.videoId, clip });
					if (!created) continue;
					const duration = toElementDurationTicks({
						seconds: clip.durationSeconds,
					});
					editor.timeline.insertElement({
						placement: { mode: "explicit", trackId: scene.tracks.main.id },
						element: buildElementFromMedia({
							mediaId: created.id,
							mediaType: created.type,
							name: clip.name,
							duration,
							startTime: mediaTimeFromSeconds({ seconds: cursor }),
							scroClipNumber: clip.clipNumber,
						}),
					});
					cursor += clip.durationSeconds;
				}
			} finally {
				busy.current = false;
				armScroSync();
			}
		}

		/** Append new storyboard clips, or re-seed when delete renumbers clips. */
		async function reconcileClips(data: ScroVideosStateMessage) {
			if (busy.current) return;
			const project = editor.project.getActiveOrNull();
			if (!project) return;
			const scene = editor.scenes.getActiveScene();
			if (!mainHasScroClip(scene.tracks.main.elements)) return;

			const wantedList = data.clips.map((clip) => clip.clipNumber);
			const presentList: number[] = [];
			const scroElements: Array<{ trackId: string; elementId: string }> = [];
			for (const element of scene.tracks.main.elements) {
				if (
					(element.type === "video" || element.type === "image") &&
					element.scroClipNumber != null
				) {
					presentList.push(element.scroClipNumber);
					scroElements.push({
						trackId: scene.tracks.main.id,
						elementId: element.id,
					});
				}
			}
			presentList.sort((a, b) => a - b);
			const wantedKey = wantedList.join(",");
			const presentKey = presentList.join(",");
			if (wantedKey === presentKey) return;

			const isAppendOnly =
				wantedList.length > presentList.length &&
				wantedList.slice(0, presentList.length).join(",") === presentKey;

			busy.current = true;
			try {
				if (!isAppendOnly) {
					if (scroElements.length > 0) {
						editor.timeline.deleteElements({ elements: scroElements });
					}
					let cursor = 0;
					for (const clip of data.clips) {
						const created = await ensureMedia({ videoId: data.videoId, clip });
						if (!created) continue;
						const duration = toElementDurationTicks({
							seconds: clip.durationSeconds,
						});
						editor.timeline.insertElement({
							placement: { mode: "explicit", trackId: scene.tracks.main.id },
							element: buildElementFromMedia({
								mediaId: created.id,
								mediaType: created.type,
								name: clip.name,
								duration,
								startTime: mediaTimeFromSeconds({ seconds: cursor }),
								scroClipNumber: clip.clipNumber,
							}),
						});
						cursor += clip.durationSeconds;
					}
					return;
				}

				const present = new Set(presentList);
				const missing = data.clips.filter((clip) => !present.has(clip.clipNumber));
				let cursor = mainTrackEndSeconds(editor.scenes.getActiveScene().tracks.main.elements);
				for (const clip of missing) {
					const created = await ensureMedia({ videoId: data.videoId, clip });
					if (!created) continue;
					const duration = toElementDurationTicks({
						seconds: clip.durationSeconds,
					});
					editor.timeline.insertElement({
						placement: { mode: "explicit", trackId: scene.tracks.main.id },
						element: buildElementFromMedia({
							mediaId: created.id,
							mediaType: created.type,
							name: clip.name,
							duration,
							startTime: mediaTimeFromSeconds({ seconds: cursor }),
							scroClipNumber: clip.clipNumber,
						}),
					});
					cursor += clip.durationSeconds;
				}
			} finally {
				busy.current = false;
				armScroSync();
			}
		}

		async function updateClip(data: ScroClipUpdatedMessage) {
			const project = editor.project.getActiveOrNull();
			if (!project) return;
			const scene = editor.scenes.getActiveScene();
			const existing = findScroElement(scene.tracks.main.elements, data.clip.clipNumber);
			if (!existing || (existing.type !== "video" && existing.type !== "image")) {
				return;
			}
			const created = await ensureMedia({ videoId: data.videoId, clip: data.clip });
			if (!created) return;
			const startTime = existing.startTime;
			const duration = existing.duration;
			if (existing.type === created.type) {
				editor.timeline.updateElements({
					updates: [
						{
							trackId: scene.tracks.main.id,
							elementId: existing.id,
							patch: { mediaId: created.id, name: data.clip.name },
						},
					],
				});
				return;
			}
			// Image ↔ video: replace the element, keep start and storyboard duration.
			editor.timeline.deleteElements({
				elements: [{ trackId: scene.tracks.main.id, elementId: existing.id }],
			});
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: scene.tracks.main.id },
				element: buildElementFromMedia({
					mediaId: created.id,
					mediaType: created.type,
					name: data.clip.name,
					duration,
					startTime,
					scroClipNumber: data.clip.clipNumber,
				}),
			});
		}

		async function ensureMedia({
			videoId,
			clip,
		}: {
			videoId: string;
			clip: ScroVideoSeedClip;
		}) {
			const project = editor.project.getActiveOrNull();
			if (!project) return null;
			const sourceUrl = clip.videoUrl || clip.posterUrl;
			let file: File;
			if (sourceUrl) {
				const response = await fetch(sourceUrl);
				if (!response.ok) return null;
				const blob = await response.blob();
				const ext = clip.videoUrl ? "mp4" : "webp";
				file = new File([blob], `${clip.name}.${ext}`, {
					type: blob.type || (clip.videoUrl ? "video/mp4" : "image/webp"),
				});
			} else {
				file = placeholderFile(`${clip.name}.png`);
			}
			const processed = await processMediaAssets({ files: [file] });
			const asset = processed[0];
			if (!asset) return null;
			const created = await editor.media.addMediaAsset({
				projectId: project.metadata.id,
				asset: {
					...asset,
					scroClipNumber: clip.clipNumber,
					scroPosterUrl: clip.posterUrl,
					thumbnailUrl: clip.posterUrl ?? asset.thumbnailUrl,
				},
			});
			if (!created) return null;
			if (sourceUrl) rememberClipSource(videoId, created.id, sourceUrl);
			return created;
		}
	}, [editor]);

	return null;
}

/** Main track end in seconds (for append helpers). */
export function mainTrackEndSeconds(elements: TimelineElement[]) {
	let end = 0;
	for (const element of elements) {
		const start = mediaTimeToSeconds({ time: element.startTime });
		const duration = mediaTimeToSeconds({ time: element.duration });
		end = Math.max(end, start + duration);
	}
	return end;
}
