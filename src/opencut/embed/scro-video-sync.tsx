"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { processMediaAssets } from "@/opencut/media/processing";
import { storageService } from "@/opencut/services/storage/service";
import { videoCache } from "@/opencut/services/video-cache/service";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { toElementDurationTicks } from "@/opencut/timeline/creation";
import { mediaTimeFromSeconds, mediaTimeToSeconds, ZERO_MEDIA_TIME } from "@/opencut/wasm";
import type { MediaAsset, MediaType } from "@/opencut/media/types";
import { applyScroCanvasSize } from "@/opencut/embed/scro-canvas-size";
import { resolveElementScroClipNumber } from "@/opencut/embed/scro-clip-number";
import { collectStaleScroAssetIds } from "@/opencut/embed/scro-video-assets";
import {
	fitFullLengthPlacements,
	storyboardPlacement,
} from "@/opencut/embed/scro-clip-duration";
import { stillPlaceholderFile } from "@/opencut/embed/scro-still-placeholder";
import { staleTimelineElementIds } from "@/service/scro-video/timeline-seed";
import {
	fetchMediaBlobWithTimeout,
	findReusableClipAsset,
	runConcurrentMediaPool,
} from "@/opencut/embed/scro-media-load";
import {
	armScroSync,
	clearClipSources,
	forgetClipSources,
	readClipSources,
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
	setScroClipMenuFlags,
	setScroVideos,
} from "@/opencut/embed/scro-video-store";
import type { TimelineElement } from "@/opencut/timeline";

const PARENT_ORIGINS = new Set([
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"https://www.scro.io",
	"https://scro.io",
]);

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

/** Visible length is the storyboard. A longer generated file keeps its tail trimmed off. */
function buildScroTimelineElement({
	mediaId,
	mediaType,
	name,
	clip,
	fileSeconds,
	startTime,
}: {
	mediaId: string;
	mediaType: MediaType;
	name: string;
	clip: ScroVideoSeedClip;
	fileSeconds?: number;
	startTime: ReturnType<typeof mediaTimeFromSeconds>;
}) {
	const place = storyboardPlacement({
		storyboardSeconds: clip.durationSeconds,
		fileSeconds: mediaType === "video" ? fileSeconds : undefined,
	});
	return buildElementFromMedia({
		mediaId,
		mediaType,
		name,
		duration: toElementDurationTicks({ seconds: place.visibleSeconds }),
		startTime,
		scroClipNumber: clip.clipNumber,
		...(mediaType === "video"
			? {
					sourceDuration: toElementDurationTicks({ seconds: place.sourceSeconds }),
					trimEnd: toElementDurationTicks({ seconds: place.trimEndSeconds }),
				}
			: {}),
	});
}

function findScroElement(
	elements: TimelineElement[],
	clipNumber: number,
	assets: Array<Pick<MediaAsset, "id" | "name" | "scroClipNumber">>,
	clips: ScroVideoSeedClip[] | undefined,
) {
	return elements.find((element) => {
		if (element.type !== "video" && element.type !== "image") return false;
		return resolveElementScroClipNumber({ element, assets, clips }) === clipNumber;
	});
}

/** Seeds and updates ScroVideo placeholders on the main track. */
export function ScroVideoSync() {
	const editor = useEditor();
	const busy = useRef(false);
	const pendingSeed = useRef<ScroSeedMessage | null>(null);
	const syncChain = useRef<Promise<void>>(Promise.resolve());
	const inFlightMedia = useRef(new Map<string, Promise<MediaAsset | null>>());

	useEffect(() => {
		if (!isScroEmbed()) return;

		function enqueueSync(fn: () => Promise<void>) {
			syncChain.current = syncChain.current
				.then(fn)
				.catch((error) => {
					console.error("[scro-video-sync] task failed:", error);
				});
		}

		const stop = listenFromScro((payload) => {
			const data = payload as
				| ScroSeedMessage
				| ScroClipUpdatedMessage
				| ScroVideosStateMessage
				| { type: "scro-clear-checked"; videoId: string }
				| { type: "scro-clip-menu-state"; videoId: string; idle?: boolean; videosEnabled?: boolean };
			if (!data || !("type" in data) || !data.videoId) return;
			if (data.type === "scro-seed-videos") {
				setScroVideos({ videoId: data.videoId, clips: data.clips });
				enqueueSync(() => seedClips(data));
				return;
			}
			if (data.type === "scro-videos-state") {
				setScroVideos({ videoId: data.videoId, clips: data.clips });
				enqueueSync(async () => {
					await retireStaleCut(data);
					await reconcileClips(data);
					await upgradeStandIns(data);
					fitStoryboardLengths(data.clips);
				});
				return;
			}
			if (data.type === "scro-clear-checked") {
				clearScroVideoChecked();
				return;
			}
			if (data.type === "scro-clip-menu-state") {
				setScroClipMenuFlags({
					idle: data.idle !== false,
					videosEnabled: data.videosEnabled === true,
				});
				return;
			}
			if (data.type === "scro-clip-updated") {
				const current = getScroVideos();
				const nextClips =
					current?.videoId === data.videoId
						? upsertScroClip({ clips: current.clips, clip: data.clip })
						: [data.clip];
				setScroVideos({ videoId: data.videoId, clips: nextClips });
				enqueueSync(() => updateClip(data));
			}
		}, PARENT_ORIGINS);

		const parentOrigin = document.referrer
			? new URL(document.referrer).origin
			: window.location.origin;
		sendToScro({ type: "scro-editor-ready" }, parentOrigin);

		return stop;

		function seedDone(videoId: string) {
			sendToScro({ type: "scro-seed-done", videoId }, parentOrigin);
		}

		async function seedClips(data: ScroSeedMessage) {
			if (busy.current) {
				if (data.replace) pendingSeed.current = data;
				else seedDone(data.videoId);
				return;
			}
			const project = editor.project.getActiveOrNull();
			if (!project) {
				seedDone(data.videoId);
				return;
			}
			let scene = editor.scenes.getActiveScene();
			if (!data.replace && mainHasScroClip(scene.tracks.main.elements)) {
				await applyScroCanvasSize(editor, data.aspectRatio);
				// Recreate keeps the local cut. Drop the previous videos before
				// the new stills and renders take their place.
				await retireStaleCut(data);
				fitStoryboardLengths(data.clips);
				armScroSync();
				seedDone(data.videoId);
				return;
			}

			await applyScroCanvasSize(editor, data.aspectRatio);

			busy.current = true;
			try {
				if (data.replace) {
					const victims = scene.tracks.main.elements
						.filter(
							(element) => element.type === "video" || element.type === "image",
						)
						.map((element) => ({
							trackId: scene.tracks.main.id,
							elementId: element.id,
						}));
					if (victims.length > 0) {
						editor.timeline.deleteElements({ elements: victims });
					}
					await editor.media.clearProjectMedia({ projectId: project.metadata.id });
					clearClipSources(data.videoId);
					scene = editor.scenes.getActiveScene();
				}
				// Storyboard order, loaded and inserted one by one so the user sees each clip appear with live progress.
				const ordered = [...data.clips].sort((a, b) => a.clipNumber - b.clipNumber);
				const total = ordered.length;
				seedDone(data.videoId);
				let cursor = 0;
				for (let index = 0; index < ordered.length; index++) {
					const clip = ordered[index];
					sendToScro(
						{
							type: "scro-load-progress",
							videoId: data.videoId,
							current: index + 1,
							total,
							label: clip.name,
						},
						parentOrigin,
					);
					const created = await ensureMedia({ videoId: data.videoId, clip });
					if (!created) continue;
					const freshScene = editor.scenes.getActiveScene();
					const place = storyboardPlacement({
						storyboardSeconds: clip.durationSeconds,
						fileSeconds: created.type === "video" ? created.duration : undefined,
					});
					editor.timeline.insertElement({
						placement: { mode: "explicit", trackId: freshScene.tracks.main.id },
						element: buildScroTimelineElement({
							mediaId: created.id,
							mediaType: created.type,
							name: clip.name,
							clip,
							fileSeconds: created.duration,
							startTime: mediaTimeFromSeconds({ seconds: cursor }),
						}),
					});
					cursor += place.visibleSeconds;
				}
				sendToScro(
					{
						type: "scro-load-progress",
						videoId: data.videoId,
						current: total,
						total,
						done: true,
					},
					parentOrigin,
				);
			} finally {
				busy.current = false;
				// Insert adopts the first image's pixel size. Re-apply after the
				// stand-in so a restart does not leave the preview at 1×1.
				await applyScroCanvasSize(editor, data.aspectRatio);
				armScroSync();
				seedDone(data.videoId);
				const next = pendingSeed.current;
				pendingSeed.current = null;
				if (next) void seedClips(next);
			}
		}

		/**
		 * Take the previous render off the timeline before the next one is placed.
		 * A clip that left the storyboard goes too. The current still stays, and so
		 * does user media such as an ending sting.
		 */
		async function retireStaleCut(data: { videoId: string; clips: ScroVideoSeedClip[] }) {
			if (busy.current) return;
			const scene = editor.scenes.getActiveScene();
			const assets = editor.media.getAssets();
			const refs = scene.tracks.main.elements.flatMap((element) => {
				if (element.type !== "video" && element.type !== "image") return [];
				return [
					{
						id: element.id,
						type: element.type,
						// Keep a "Clip 4" label even after that clip left the storyboard,
						// so the old video can be removed instead of looking like user media.
						clipNumber: resolveElementScroClipNumber({
							element,
							assets,
							clips: undefined,
						}),
						startTime: element.startTime,
					},
				];
			});
			const staleIds = new Set(
				staleTimelineElementIds({ elements: refs, clips: data.clips }),
			);
			if (staleIds.size === 0) return;
			const stale = refs.filter((element) => staleIds.has(element.id));
			busy.current = true;
			try {
				editor.timeline.deleteElements({
					elements: stale.map((element) => ({
						trackId: scene.tracks.main.id,
						elementId: element.id,
					})),
				});
				const replaced = new Set<number>();
				for (const element of stale) {
					if (element.clipNumber == null || replaced.has(element.clipNumber)) continue;
					replaced.add(element.clipNumber);
					const clip = data.clips.find((item) => item.clipNumber === element.clipNumber);
					if (!clip) {
						const project = editor.project.getActiveOrNull();
						if (project) {
							await purgeStaleMediaAssets({
								projectId: project.metadata.id,
								videoId: data.videoId,
								clipNumber: element.clipNumber,
								clips: data.clips,
							});
						}
						continue;
					}
					const fresh = editor.scenes.getActiveScene();
					if (
						findScroElement(
							fresh.tracks.main.elements,
							clip.clipNumber,
							editor.media.getAssets(),
							data.clips,
						)
					) {
						continue;
					}
					const created = await ensureMedia({ videoId: data.videoId, clip });
					if (!created) continue;
					editor.timeline.insertElement({
						placement: { mode: "explicit", trackId: fresh.tracks.main.id },
						element: buildScroTimelineElement({
							mediaId: created.id,
							mediaType: created.type,
							name: clip.name,
							clip,
							fileSeconds: created.duration,
							startTime: element.startTime,
						}),
					});
				}
			} finally {
				busy.current = false;
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

			// A hand-edited timeline (split clips, extra drops) is not a fresh seed.
			// Wiping it to match clip numbers would throw away that edit.
			const hasManualClip = scene.tracks.main.elements.some(
				(element) =>
					(element.type === "video" || element.type === "image") &&
					element.scroClipNumber == null,
			);
			if (hasManualClip && !isAppendOnly) return;

			busy.current = true;
			try {
				if (!isAppendOnly) {
					if (scroElements.length > 0) {
						editor.timeline.deleteElements({ elements: scroElements });
					}
					const resolved = await runConcurrentMediaPool({
						items: data.clips,
						worker: (clip) => ensureMedia({ videoId: data.videoId, clip }),
					});
					let cursor = 0;
					for (let index = 0; index < data.clips.length; index++) {
						const clip = data.clips[index];
						const created = resolved[index];
						if (!created) continue;
						editor.timeline.insertElement({
							placement: { mode: "explicit", trackId: scene.tracks.main.id },
							element: buildScroTimelineElement({
								mediaId: created.id,
								mediaType: created.type,
								name: clip.name,
								clip,
								fileSeconds: created.duration,
								startTime: mediaTimeFromSeconds({ seconds: cursor }),
							}),
						});
						cursor += storyboardPlacement({
							storyboardSeconds: clip.durationSeconds,
							fileSeconds: created.type === "video" ? created.duration : undefined,
						}).visibleSeconds;
					}
					return;
				}

				const present = new Set(presentList);
				const missing = data.clips.filter((clip) => !present.has(clip.clipNumber));
				const resolved = await runConcurrentMediaPool({
					items: missing,
					worker: (clip) => ensureMedia({ videoId: data.videoId, clip }),
				});
				let cursor = mainTrackEndSeconds(editor.scenes.getActiveScene().tracks.main.elements);
				for (let index = 0; index < missing.length; index++) {
					const clip = missing[index];
					const created = resolved[index];
					if (!created) continue;
					editor.timeline.insertElement({
						placement: { mode: "explicit", trackId: scene.tracks.main.id },
						element: buildScroTimelineElement({
							mediaId: created.id,
							mediaType: created.type,
							name: clip.name,
							clip,
							fileSeconds: created.duration,
							startTime: mediaTimeFromSeconds({ seconds: cursor }),
						}),
					});
					cursor += storyboardPlacement({
						storyboardSeconds: clip.durationSeconds,
						fileSeconds: created.type === "video" ? created.duration : undefined,
					}).visibleSeconds;
				}
			} finally {
				busy.current = false;
				armScroSync();
			}
		}

		function placeholderFrame() {
			const size = editor.project.getActiveOrNull()?.settings.canvasSize;
			if (size && size.width > 16 && size.height > 16) {
				return { width: size.width, height: size.height };
			}
			return { width: 1080, height: 1920 };
		}

		/** Swap a stretched 1×1 stand-in or load newly finished stills/videos into Media & Timeline. */
		async function upgradeStandIns(data: ScroVideosStateMessage) {
			if (busy.current) return;
			for (const clip of data.clips) {
				const scene = editor.scenes.getActiveScene();
				const clipSources = readClipSources(data.videoId);
				const assets = editor.media.getAssets();
				if (clip.videoUrl || clip.posterUrl) {
					const wantedType = clip.videoUrl && !clip.staleVideo ? "video" : "image";
					const reusable = findReusableClipAsset({
						clip,
						assets,
						clipSources,
					});
					const existing = findScroElement(
						scene.tracks.main.elements,
						clip.clipNumber,
						assets,
						data.clips,
					);
					const needsTimelineSwap =
						existing &&
						(existing.type === "image" || existing.type === "video") &&
						(existing.type !== wantedType ||
							(reusable != null && existing.mediaId !== reusable.id));
					if (!reusable || needsTimelineSwap) {
						await updateClip({
							type: "scro-clip-updated",
							videoId: data.videoId,
							clip,
						});
					}
					continue;
				}
				const existing = findScroElement(
					scene.tracks.main.elements,
					clip.clipNumber,
					assets,
					data.clips,
				);
				const asset =
					existing && "mediaId" in existing
						? assets.find((item) => item.id === existing.mediaId)
						: assets.find((item) => item.scroClipNumber === clip.clipNumber);
				if (
					asset?.scroPlaceholder &&
					(asset.width ?? 0) > 16 &&
					(asset.height ?? 0) > 16
				) {
					continue;
				}
				await updateClip({
					type: "scro-clip-updated",
					videoId: data.videoId,
					clip,
				});
			}
		}

		async function updateClip(data: ScroClipUpdatedMessage) {
			const project = editor.project.getActiveOrNull();
			if (!project) return;
			// Capture the existing timeline element before ensureMedia purges stale assets,
			// so elements restored without scroClipNumber can still resolve via their old asset.
			const preScene = editor.scenes.getActiveScene();
			const preExisting = findScroElement(
				preScene.tracks.main.elements,
				data.clip.clipNumber,
				editor.media.getAssets(),
				getScroVideos()?.clips,
			);
			// Always ensure the finished still or video is registered in editor.media first
			// so the Assets panel refreshes and reloads the preview image immediately,
			// even if the timeline element was removed or is still a placeholder.
			const created = await ensureMedia({ videoId: data.videoId, clip: data.clip });
			if (!created) return;
			const scene = editor.scenes.getActiveScene();
			const existing =
				findScroElement(
					scene.tracks.main.elements,
					data.clip.clipNumber,
					editor.media.getAssets(),
					getScroVideos()?.clips,
				) ??
				(preExisting
					? scene.tracks.main.elements.find((item) => item.id === preExisting.id)
					: undefined);
			if (!existing || (existing.type !== "video" && existing.type !== "image")) {
				return;
			}
			const startTime = existing.startTime;
			if (existing.type === created.type) {
				const place = storyboardPlacement({
					storyboardSeconds: data.clip.durationSeconds,
					fileSeconds: created.type === "video" ? created.duration : undefined,
				});
				const nextDuration = toElementDurationTicks({ seconds: place.visibleSeconds });
				const nextSourceDuration =
					created.type === "video"
						? toElementDurationTicks({ seconds: place.sourceSeconds })
						: undefined;
				const nextTrimEnd =
					created.type === "video"
						? toElementDurationTicks({ seconds: place.trimEndSeconds })
						: ZERO_MEDIA_TIME;
				if (
					existing.mediaId !== created.id ||
					existing.name !== data.clip.name ||
					existing.duration !== nextDuration
				) {
					editor.timeline.updateElements({
						updates: [
							{
								trackId: scene.tracks.main.id,
								elementId: existing.id,
								patch: {
									mediaId: created.id,
									name: data.clip.name,
									scroClipNumber: data.clip.clipNumber,
									duration: nextDuration,
									trimStart: ZERO_MEDIA_TIME,
									trimEnd: nextTrimEnd,
									...(nextSourceDuration !== undefined
										? { sourceDuration: nextSourceDuration }
										: {}),
								},
							},
						],
					});
				}
				fitStoryboardLengths(getScroVideos()?.clips ?? [data.clip]);
				armScroSync();
				return;
			}
			// Image ↔ video: replace the element with its confirmed video or storyboard length, then rearrange.
			editor.timeline.deleteElements({
				elements: [{ trackId: scene.tracks.main.id, elementId: existing.id }],
			});
			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId: scene.tracks.main.id },
				element: buildScroTimelineElement({
					mediaId: created.id,
					mediaType: created.type,
					name: data.clip.name,
					clip: data.clip,
					fileSeconds: created.duration,
					startTime,
				}),
			});
			fitStoryboardLengths(getScroVideos()?.clips ?? [data.clip]);
			armScroSync();
		}

		/** Rearrange main-track clips to confirmed video lengths or storyboard lengths with no overlap. */
		function fitStoryboardLengths(clips: ScroVideoSeedClip[]) {
			if (clips.length === 0) return;
			const scene = editor.scenes.getActiveScene();
			const assets = editor.media.getAssets();
			const elements = scene.tracks.main.elements.map((element) => {
				const mediaId = "mediaId" in element ? element.mediaId : undefined;
				const asset = mediaId ? assets.find((item) => item.id === mediaId) : undefined;
				const sourceDuration =
					"sourceDuration" in element ? element.sourceDuration : undefined;
				return {
					id: element.id,
					clipNumber: resolveElementScroClipNumber({ element, assets, clips }),
					startSeconds: mediaTimeToSeconds({ time: element.startTime }),
					durationSeconds: mediaTimeToSeconds({ time: element.duration }),
					trimStartSeconds: mediaTimeToSeconds({ time: element.trimStart }),
					trimEndSeconds: mediaTimeToSeconds({ time: element.trimEnd }),
					sourceSeconds:
						sourceDuration != null ? mediaTimeToSeconds({ time: sourceDuration }) : null,
					fileSeconds: asset?.type === "video" ? (asset.duration ?? null) : null,
				};
			});
			const patches = fitFullLengthPlacements({
				elements,
				storyboard: clips.map((clip) => ({
					clipNumber: clip.clipNumber,
					durationSeconds: clip.durationSeconds,
				})),
			});
			if (patches.length === 0) return;
			editor.timeline.updateElements({
				pushHistory: false,
				updates: patches.map((patch) => {
					const element = scene.tracks.main.elements.find((item) => item.id === patch.id);
					return {
						trackId: scene.tracks.main.id,
						elementId: patch.id,
						patch: {
							startTime: mediaTimeFromSeconds({ seconds: patch.startSeconds }),
							...(patch.durationChanged
								? {
										duration: mediaTimeFromSeconds({ seconds: patch.durationSeconds }),
										trimEnd: mediaTimeFromSeconds({ seconds: patch.trimEndSeconds }),
										...(element?.type === "video"
											? {
													sourceDuration: mediaTimeFromSeconds({
														seconds: patch.sourceSeconds,
													}),
												}
											: {}),
									}
								: {}),
						},
					};
				}),
			});
		}

		async function purgeStaleMediaAssets({
			projectId,
			videoId,
			clipNumber,
			keepAssetId,
			clips,
		}: {
			projectId: string;
			videoId: string;
			clipNumber?: number;
			keepAssetId?: string;
			clips: ScroVideoSeedClip[] | undefined;
		}) {
			const currentAssets = editor.media.getAssets();
			const staleIds = collectStaleScroAssetIds({
				assets: currentAssets,
				clips,
				clipNumber,
				keepAssetId,
			});
			if (staleIds.length === 0) return;
			const staleSet = new Set(staleIds);
			for (const asset of currentAssets) {
				if (!staleSet.has(asset.id)) continue;
				videoCache.clearVideo({ mediaId: asset.id });
				if (asset.url?.startsWith("blob:")) {
					URL.revokeObjectURL(asset.url);
				}
				if (asset.thumbnailUrl?.startsWith("blob:")) {
					URL.revokeObjectURL(asset.thumbnailUrl);
				}
			}
			editor.media.setAssets({
				assets: currentAssets.filter((asset) => !staleSet.has(asset.id)),
			});
			forgetClipSources(videoId, staleIds);
			await Promise.all(
				staleIds.map((id) =>
					storageService.deleteMediaAsset({ projectId, id }).catch(() => undefined),
				),
			);
		}

		async function ensureMedia({
			videoId,
			clip,
		}: {
			videoId: string;
			clip: ScroVideoSeedClip;
		}): Promise<MediaAsset | null> {
			const useVideo = Boolean(clip.videoUrl && !clip.staleVideo);
			const sourceUrl = useVideo ? clip.videoUrl : clip.posterUrl || clip.videoUrl;
			const flightKey = `${videoId}:${clip.clipNumber}:${sourceUrl ?? "placeholder"}`;
			const activeFlight = inFlightMedia.current.get(flightKey);
			if (activeFlight) return activeFlight;

			const task = (async () => {
				const project = editor.project.getActiveOrNull();
				if (!project) return null;
				const clips = getScroVideos()?.clips;
				const reusable = findReusableClipAsset({
					clip,
					assets: editor.media.getAssets(),
					clipSources: readClipSources(videoId),
				});
				if (reusable) {
					await purgeStaleMediaAssets({
						projectId: project.metadata.id,
						videoId,
						clipNumber: clip.clipNumber,
						keepAssetId: reusable.id,
						clips,
					});
					return reusable;
				}
				let file: File;
				if (sourceUrl) {
					const blob = await fetchMediaBlobWithTimeout({ url: sourceUrl });
					if (!blob) return null;
					const ext = useVideo ? "mp4" : "webp";
					file = new File([blob], `${clip.name}.${ext}`, {
						type: blob.type || (useVideo ? "video/mp4" : "image/webp"),
					});
				} else {
					const frame = placeholderFrame();
					file = await stillPlaceholderFile({
						name: clip.name,
						width: frame.width,
						height: frame.height,
					});
				}
				const processed = await processMediaAssets({ files: [file] });
				const asset = processed[0];
				if (!asset) return null;
				const created = await editor.media.addMediaAsset({
					projectId: project.metadata.id,
					asset: {
						...asset,
						name: clip.name,
						scroClipNumber: clip.clipNumber,
						scroPosterUrl: clip.posterUrl,
						scroPlaceholder: !sourceUrl,
						thumbnailUrl:
							asset.type === "video"
								? (asset.thumbnailUrl ?? clip.posterUrl)
								: (clip.posterUrl ?? asset.thumbnailUrl),
					},
				});
				if (!created) return null;
				if (sourceUrl) rememberClipSource(videoId, created.id, sourceUrl);
				await purgeStaleMediaAssets({
					projectId: project.metadata.id,
					videoId,
					clipNumber: clip.clipNumber,
					keepAssetId: created.id,
					clips,
				});
				return created;
			})();

			inFlightMedia.current.set(flightKey, task);
			try {
				return await task;
			} finally {
				inFlightMedia.current.delete(flightKey);
			}
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
