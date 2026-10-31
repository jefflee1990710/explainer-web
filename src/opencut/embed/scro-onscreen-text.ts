"use client";

import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
} from "@/opencut/commands";
import type { EditorCore } from "@/opencut/core";
import { fetchMediaBlobWithTimeout } from "@/opencut/embed/scro-media-load";
import { armScroSync, rememberClipSource } from "@/opencut/embed/scro-media-sources";
import {
	getScroOnscreenTexts,
	removeScroOnscreenText,
	replaceOptimisticScroOnscreenTextInStore,
	scroOnscreenTextDisplayName,
	setScroOnscreenTexts,
	upsertScroOnscreenText,
	useScroOnscreenTexts,
	type ScroOnscreenText,
	type ScroOnscreenTextStage,
} from "@/opencut/embed/scro-onscreen-text-store";
import { processMediaAssets } from "@/opencut/media/processing";
import { storageService } from "@/opencut/services/storage/service";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";

export {
	getScroOnscreenTexts,
	removeScroOnscreenText,
	scroOnscreenTextDisplayName,
	setScroOnscreenTexts,
	upsertScroOnscreenText,
	useScroOnscreenTexts,
	type ScroOnscreenText,
	type ScroOnscreenTextStage,
};

const DEFAULT_DURATION_SEC = 3;
const PLACEHOLDER_WIDTH = 1280;
const PLACEHOLDER_HEIGHT = 360;
const hydratingIds = new Set<string>();

// Draw a visual stand-in card while the AI subtitle graphic is queued/generating in the background.
export function drawOnscreenTextPlaceholder(
	ctx: CanvasRenderingContext2D,
	input: {
		text: string;
		styleName?: string;
		width?: number;
		height?: number;
	},
) {
	const width = input.width ?? PLACEHOLDER_WIDTH;
	const height = input.height ?? PLACEHOLDER_HEIGHT;
	ctx.clearRect(0, 0, width, height);

	const padX = 48;
	const padY = 28;
	const boxW = width - padX * 2;
	const boxH = height - padY * 2;

	ctx.save();
	ctx.beginPath();
	ctx.roundRect(padX, padY, boxW, boxH, 28);
	ctx.fillStyle = "rgba(18, 20, 28, 0.86)";
	ctx.fill();
	ctx.lineWidth = 4;
	ctx.setLineDash([14, 10]);
	ctx.strokeStyle = "#c6f24b";
	ctx.stroke();
	ctx.restore();

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	const badgeText = input.styleName
		? `AI ON-SCREEN TEXT · ${input.styleName.toUpperCase()} · GENERATING…`
		: "AI ON-SCREEN TEXT · GENERATING…";
	ctx.fillStyle = "#c6f24b";
	ctx.font = "700 24px ui-sans-serif, system-ui, sans-serif";
	ctx.fillText(badgeText, width / 2, padY + 68, boxW - 64);

	const displayLine = input.text.replace(/\s+/g, " ").trim().slice(0, 48) || "Subtitle";
	ctx.fillStyle = "#ffffff";
	ctx.font = "800 58px ui-sans-serif, system-ui, sans-serif";
	ctx.fillText(displayLine, width / 2, height / 2 + 28, boxW - 72);
}

// Create a PNG File placeholder for a queued `ScroOnscreenText` asset.
export async function onscreenTextPlaceholderFile(input: {
	text: string;
	styleName?: string;
}): Promise<File> {
	const canvas = document.createElement("canvas");
	canvas.width = PLACEHOLDER_WIDTH;
	canvas.height = PLACEHOLDER_HEIGHT;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not draw ScroOnscreenText placeholder");
	drawOnscreenTextPlaceholder(ctx, input);
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((next) => {
			if (next) resolve(next);
			else reject(new Error("Could not encode ScroOnscreenText placeholder"));
		}, "image/png");
	});
	const name = scroOnscreenTextDisplayName(input.text);
	return new File([blob], `${name}.png`, { type: "image/png" });
}

// Insert a `ScroOnscreenText` placeholder (or completed image) onto an overlay track at the current playhead.
export async function insertScroOnscreenTextOnTimeline({
	editor,
	videoId,
	item,
	trackTitle = "On-Screen Text",
}: {
	editor: EditorCore;
	videoId: string | null;
	item: ScroOnscreenText;
	trackTitle?: string;
}): Promise<{ assetId: string; elementId: string } | null> {
	const project = editor.project.getActiveOrNull();
	if (!project) return null;

	const isCompletedWithUrl = item.status === "completed" && Boolean(item.url);
	let file: File;
	if (isCompletedWithUrl && item.url) {
		const blob = await fetchMediaBlobWithTimeout({ url: item.url });
		if (!blob) return null;
		file = new File([blob], `${scroOnscreenTextDisplayName(item.text)}.png`, {
			type: "image/png",
		});
	} else {
		file = await onscreenTextPlaceholderFile({
			text: item.text,
			styleName: item.styleName,
		});
	}

	const processed = await processMediaAssets({ files: [file] });
	const first = processed[0];
	if (!first) return null;

	const createdAsset = await editor.media.addMediaAsset({
		projectId: project.metadata.id,
		asset: {
			...first,
			name: scroOnscreenTextDisplayName(item.text),
			scroOnscreenTextId: item.id,
			scroPlaceholder: !isCompletedWithUrl,
			...(isCompletedWithUrl && item.url ? { sourceUrl: item.url } : {}),
		},
	});
	if (!createdAsset) return null;
	if (isCompletedWithUrl && item.url && videoId) {
		rememberClipSource(videoId, createdAsset.id, item.url);
	}

	const scene = editor.scenes.getActiveScene();
	const existingTrack = scene.tracks.overlay.find((track) => track.type === "video");
	let trackId = existingTrack?.id;
	let addTrackCmd: AddTrackCommand | null = null;
	if (!trackId) {
		addTrackCmd = new AddTrackCommand({
			type: "video",
			index: 0,
			name: trackTitle,
		});
		trackId = addTrackCmd.getTrackId();
	}

	const playheadSeconds = mediaTimeToSeconds({
		time: editor.playback.getCurrentTime(),
	});
	const baseElement = buildElementFromMedia({
		mediaId: createdAsset.id,
		mediaType: "image",
		name: scroOnscreenTextDisplayName(item.text),
		startTime: mediaTimeFromSeconds({ seconds: Math.max(0, playheadSeconds) }),
		duration: mediaTimeFromSeconds({ seconds: DEFAULT_DURATION_SEC }),
		scroOnscreenTextId: item.id,
	});
	const element = {
		...baseElement,
		params: {
			...baseElement.params,
			"transform.scaleX": 0.88,
			"transform.scaleY": 0.88,
			"transform.positionX": 0,
			"transform.positionY": 0,
		},
	};

	const insertCmd = new InsertElementCommand({
		placement: { mode: "explicit", trackId },
		element,
	});
	editor.command.execute({
		command: addTrackCmd ? new BatchCommand([addTrackCmd, insertCmd]) : insertCmd,
	});
	armScroSync();
	return {
		assetId: createdAsset.id,
		elementId: insertCmd.getElementId(),
	};
}

// Rebind an optimistic `temp_*` ScroOnscreenText ID to the real server ID once the enqueue action returns.
export function rebindOptimisticScroOnscreenTextId({
	editor,
	tempId,
	realItem,
}: {
	editor: EditorCore;
	tempId: string;
	realItem: ScroOnscreenText;
}): void {
	replaceOptimisticScroOnscreenTextInStore({ tempId, realItem });

	const assets = editor.media.getAssets();
	const nextAssets = assets.map((asset) =>
		asset.scroOnscreenTextId === tempId
			? { ...asset, scroOnscreenTextId: realItem.id }
			: asset,
	);
	editor.media.setAssets({ assets: nextAssets });

	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return;
	let changed = false;
	const nextOverlay = scene.tracks.overlay.map((track) => {
		if (track.type !== "video") return track;
		return {
			...track,
			elements: track.elements.map((el) => {
				if (el.type === "image" && el.scroOnscreenTextId === tempId) {
					changed = true;
					return { ...el, scroOnscreenTextId: realItem.id };
				}
				return el;
			}),
		};
	});
	if (changed) {
		editor.timeline.updateTracks({
			...scene.tracks,
			overlay: nextOverlay,
		});
	}
}

// Reconcile completed `ScroOnscreenText` items from the server: downloads the finished transparent PNG
// and replaces any placeholder asset & timeline element in-place so the canvas and timeline refresh automatically.
export async function reconcileScroOnscreenTextsWithEditor({
	editor,
	videoId,
	items,
}: {
	editor: EditorCore;
	videoId: string;
	items: ScroOnscreenText[];
}): Promise<void> {
	const project = editor.project.getActiveOrNull();
	if (!project) return;

	for (const item of items) {
		if (item.status !== "completed" || !item.url) continue;
		if (hydratingIds.has(item.id)) continue;

		const currentAssets = editor.media.getAssets();
		const existingReal = currentAssets.find(
			(asset) =>
				asset.scroOnscreenTextId === item.id &&
				asset.scroPlaceholder !== true &&
				(asset.sourceUrl === item.url || Boolean(asset.url)),
		);
		const placeholderAssets = currentAssets.filter(
			(asset) =>
				asset.scroOnscreenTextId === item.id && asset.scroPlaceholder === true,
		);

		if (existingReal && placeholderAssets.length === 0) continue;

		hydratingIds.add(item.id);
		try {
			let finalAsset = existingReal;
			if (!finalAsset) {
				const blob = await fetchMediaBlobWithTimeout({ url: item.url });
				if (!blob) continue;
				const file = new File(
					[blob],
					`${scroOnscreenTextDisplayName(item.text)}.png`,
					{ type: "image/png" },
				);
				const processed = await processMediaAssets({ files: [file] });
				const first = processed[0];
				if (!first) continue;

				finalAsset =
					(await editor.media.addMediaAsset({
						projectId: project.metadata.id,
						asset: {
							...first,
							name: scroOnscreenTextDisplayName(item.text),
							scroOnscreenTextId: item.id,
							scroPlaceholder: false,
							sourceUrl: item.url,
						},
					})) ?? undefined;
			}

			if (!finalAsset) continue;
			rememberClipSource(videoId, finalAsset.id, item.url);

			const placeholderIds = new Set(placeholderAssets.map((a) => a.id));
			const scene = editor.scenes.getActiveSceneOrNull();
			if (scene) {
				let updatedTimeline = false;
				const swapElement = <
					T extends { type: string; mediaId?: string; scroOnscreenTextId?: string },
				>(
					el: T,
				): T => {
					if (
						el.type === "image" &&
						(el.scroOnscreenTextId === item.id ||
							(el.mediaId && placeholderIds.has(el.mediaId)))
					) {
						if (el.mediaId !== finalAsset!.id || el.scroOnscreenTextId !== item.id) {
							updatedTimeline = true;
							return {
								...el,
								mediaId: finalAsset!.id,
								scroOnscreenTextId: item.id,
							};
						}
					}
					return el;
				};

				const nextOverlay = scene.tracks.overlay.map((track) => {
					if (track.type !== "video") return track;
					return {
						...track,
						elements: track.elements.map((el) => swapElement(el)),
					};
				});
				const nextMainElements = scene.tracks.main.elements.map((el) =>
					swapElement(el),
				);

				if (updatedTimeline) {
					editor.timeline.updateTracks({
						...scene.tracks,
						main: { ...scene.tracks.main, elements: nextMainElements },
						overlay: nextOverlay,
					});
				}
			}

			if (placeholderIds.size > 0) {
				const remaining = editor.media
					.getAssets()
					.filter((asset) => !placeholderIds.has(asset.id));
				editor.media.setAssets({ assets: remaining });
				for (const oldAsset of placeholderAssets) {
					if (oldAsset.url) URL.revokeObjectURL(oldAsset.url);
					if (oldAsset.thumbnailUrl && oldAsset.thumbnailUrl !== oldAsset.url) {
						URL.revokeObjectURL(oldAsset.thumbnailUrl);
					}
					await storageService
						.deleteMediaAsset({
							projectId: project.metadata.id,
							id: oldAsset.id,
						})
						.catch(() => {});
				}
			}

			armScroSync();
		} finally {
			hydratingIds.delete(item.id);
		}
	}
}
