import type { DragEvent } from "react";
import { processMediaAssets } from "@/opencut/media/processing";
import { showMediaUploadToast } from "@/opencut/media/upload-toast";
import {
	DEFAULT_NEW_ELEMENT_DURATION,
	toElementDurationTicks,
} from "@/opencut/timeline/creation";
import { placementForScroMedia } from "@/opencut/embed/scro-clip-duration";
import {
	isScroAssetEditLocked,
	resolveScroClipNumber,
} from "@/opencut/embed/scro-clip-number";
import { getScroVideos } from "@/opencut/embed/scro-video-store";
import { findNonOverlappingMainTrackStartTime } from "@/opencut/timeline/placement";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/opencut/timeline/scale";
import type { FrameRate } from "opencut-wasm";
import {
	buildTextElement,
	buildGraphicElement,
	buildStickerElement,
	buildElementFromMedia,
	buildEffectElement,
} from "@/opencut/timeline/element-utils";
import { InsertElementCommand } from "@/opencut/commands/timeline";
import type { Command } from "@/opencut/commands/base-command";
import { effectTimingAt, transitionTimingAt } from "@/opencut/effects/effect-timing";
import { isTransitionEffectType } from "@/opencut/effects/transition-layout";
import { computeDropTarget } from "@/opencut/timeline/components/drop-target";
import type { TimelineDragSource } from "@/opencut/timeline/drag-source";
import type {
	TrackType,
	DropTarget,
	ElementType,
	SceneTracks,
	TimelineTrack,
	CreateTimelineElement,
} from "@/opencut/timeline";
import type { TimelineDragData } from "@/opencut/timeline/drag";
import type { MediaAsset } from "@/opencut/media/types";
import type { ProcessedMediaAsset } from "@/opencut/media/processing";
import { mediaTime, roundFrameTime, TICKS_PER_SECOND, type MediaTime } from "@/opencut/wasm";

// --- Config ---

export interface DragDropConfig {
	zoomLevel: number;
	getContainerEl: () => HTMLDivElement | null;
	getHeaderEl: () => HTMLElement | null;
	getTracksScrollEl: () => HTMLDivElement | null;
	getActiveProjectFps: () => FrameRate | null;
	getActiveProjectId: () => string | null;
	getSceneTracks: () => SceneTracks;
	getCurrentPlayheadTime: () => MediaTime;
	getMediaAssets: () => MediaAsset[];
	dragSource: TimelineDragSource;
	addMediaAsset: (args: {
		projectId: string;
		asset: ProcessedMediaAsset;
	}) => Promise<MediaAsset | null>;
	executeCommand: (command: Command) => void;
	insertElement: (args: {
		placement:
			| { mode: "explicit"; trackId: string }
			| { mode: "auto"; trackType?: TrackType; insertIndex?: number };
		element: CreateTimelineElement;
	}) => void;
	addClipEffect: (args: {
		trackId: string;
		elementId: string;
		effectType: string;
	}) => void;
}

export interface DragDropConfigRef {
	readonly current: DragDropConfig;
}

// --- State ---

interface DragOverState {
	kind: "over";
	dropTarget: DropTarget | null;
	elementType: ElementType | null;
}

type DragDropState = { kind: "idle" } | DragOverState;

interface TimelineCoords {
	mouseX: number;
	mouseY: number;
}

// --- Pure helpers ---

function elementTypeFromDrag({
	dragData,
}: {
	dragData: TimelineDragData;
}): ElementType {
	switch (dragData.type) {
		case "text":
			return "text";
		case "graphic":
			return "graphic";
		case "sticker":
			return "sticker";
		case "effect":
			return "effect";
		case "media":
			return dragData.mediaType;
	}
}

function getTargetElementTypesForDrag({
	dragData,
}: {
	dragData: TimelineDragData;
}): string[] | undefined {
	if (dragData.type === "effect") return dragData.targetElementTypes;
	if (dragData.type === "media") return dragData.targetElementTypes;
	return undefined;
}

function getDurationForDrag({
	dragData,
	mediaAssets,
}: {
	dragData: TimelineDragData;
	mediaAssets: MediaAsset[];
}): MediaTime {
	if (dragData.type !== "media") return DEFAULT_NEW_ELEMENT_DURATION;
	const media = mediaAssets.find((asset) => asset.id === dragData.id);
	const placed = media
		? placementForScroMedia({ asset: media, clips: getScroVideos()?.clips })
		: null;
	return toElementDurationTicks({ seconds: placed?.visibleSeconds ?? media?.duration });
}

/** Storyboard length for a Scro clip; the generated file's extra seconds stay trimmed. */
function buildDroppedMediaElement({
	asset,
	name,
	startTime,
}: {
	asset: MediaAsset;
	name?: string;
	startTime: MediaTime;
}) {
	const placed = placementForScroMedia({ asset, clips: getScroVideos()?.clips });
	return buildElementFromMedia({
		mediaId: asset.id,
		mediaType: asset.type,
		name: name ?? asset.name,
		duration: toElementDurationTicks({
			seconds: placed?.visibleSeconds ?? asset.duration,
		}),
		startTime,
		scroClipNumber: placed?.clipNumber ?? asset.scroClipNumber,
		...(placed
			? {
					sourceDuration: toElementDurationTicks({ seconds: placed.sourceSeconds }),
					trimEnd: toElementDurationTicks({ seconds: placed.trimEndSeconds }),
				}
			: {}),
	});
}

function orderedTracks({
	sceneTracks,
}: {
	sceneTracks: SceneTracks;
}): TimelineTrack[] {
	return [...sceneTracks.overlay, sceneTracks.main, ...sceneTracks.audio];
}

// --- Controller ---

export class DragDropController {
	private state: DragDropState = { kind: "idle" };
	private enterCount = 0;
	private readonly subscribers = new Set<() => void>();
	private readonly configRef: DragDropConfigRef;

	constructor(deps: { configRef: DragDropConfigRef }) {
		this.configRef = deps.configRef;
		this.onDragEnter = this.onDragEnter.bind(this);
		this.onDragOver = this.onDragOver.bind(this);
		this.onDragLeave = this.onDragLeave.bind(this);
		this.onDrop = this.onDrop.bind(this);
	}

	private get config(): DragDropConfig {
		return this.configRef.current;
	}

	get isDragOver(): boolean {
		return this.state.kind !== "idle";
	}

	get dropTarget(): DropTarget | null {
		return this.state.kind === "over" ? this.state.dropTarget : null;
	}

	get dragElementType(): ElementType | null {
		return this.state.kind === "over" ? this.state.elementType : null;
	}

	subscribe(fn: () => void): () => void {
		this.subscribers.add(fn);
		return () => this.subscribers.delete(fn);
	}

	destroy(): void {
		this.subscribers.clear();
	}

	// --- Drag event handlers (bound, stable, passed as React props) ---

	onDragEnter(event: DragEvent): void {
		event.preventDefault();
		const hasAsset = this.config.dragSource.isActive();
		const hasFiles = event.dataTransfer.types.includes("Files");
		if (!hasAsset && !hasFiles) return;

		this.enterCount += 1;
		if (this.state.kind === "idle") {
			this.setOver({ dropTarget: null, elementType: null });
		}
	}

	onDragOver(event: DragEvent): void {
		event.preventDefault();

		const coords = this.getMouseTimelineCoords({ event });
		if (!coords) return;

		const dragData = this.config.dragSource.getActive();
		const hasFiles = event.dataTransfer.types.includes("Files");
		const isExternal = hasFiles && !dragData;

		if (!dragData) {
			if (hasFiles && isExternal) {
				this.setOver({ dropTarget: null, elementType: null });
			}
			return;
		}

		const elementType = elementTypeFromDrag({ dragData });
		const sceneTracks = this.config.getSceneTracks();
		const mediaAssets = this.config.getMediaAssets();
		const scroClips = getScroVideos()?.clips;
		const draggedMediaAsset =
			dragData.type === "media"
				? mediaAssets.find((asset) => asset.id === dragData.id)
				: undefined;
		if (
			draggedMediaAsset &&
			isScroAssetEditLocked({ asset: draggedMediaAsset, clips: scroClips })
		) {
			this.setOver({ dropTarget: null, elementType: null });
			event.dataTransfer.dropEffect = "none";
			return;
		}
		const isDraggedScroMedia =
			draggedMediaAsset != null &&
			resolveScroClipNumber({ asset: draggedMediaAsset, clips: scroClips }) !=
				null;
		let duration = getDurationForDrag({
			dragData,
			mediaAssets,
		});
		let targetElementTypes = getTargetElementTypesForDrag({ dragData });
		let startTimeOverride: MediaTime | undefined;

		if (dragData.type === "effect") {
			const pointerTime = isExternal
				? this.config.getCurrentPlayheadTime()
				: mediaTime({
						ticks: Math.round(
							Math.max(
								0,
								coords.mouseX /
									(BASE_TIMELINE_PIXELS_PER_SECOND * this.config.zoomLevel),
							) * TICKS_PER_SECOND,
						),
					});
			const timing = isTransitionEffectType(dragData.effectType)
				? transitionTimingAt({ time: pointerTime, tracks: sceneTracks })
				: effectTimingAt({ time: pointerTime, tracks: sceneTracks });
			duration = timing.duration;
			startTimeOverride = timing.startTime;
			targetElementTypes = [];
		}

		const target = computeDropTarget({
			elementType,
			mouseX: coords.mouseX,
			mouseY: coords.mouseY,
			tracks: sceneTracks,
			playheadTime: this.config.getCurrentPlayheadTime(),
			isExternalDrop: isExternal,
			elementDuration: duration,
			pixelsPerSecond: BASE_TIMELINE_PIXELS_PER_SECOND,
			zoomLevel: this.config.zoomLevel,
			targetElementTypes: isDraggedScroMedia ? [] : targetElementTypes,
			startTimeOverride,
		});
		const fps = this.config.getActiveProjectFps();
		if (dragData.type === "effect" && startTimeOverride !== undefined) {
			// Keep the block on the clip edge if track placement moves x.
			target.xPosition = startTimeOverride;
			target.anchoredDuration = duration;
		}
		if (isDraggedScroMedia) {
			target.trackIndex = sceneTracks.overlay.length;
			target.isNewTrack = false;
			target.targetElement = null;
			target.xPosition = findNonOverlappingMainTrackStartTime({
				mainTrack: sceneTracks.main,
				requestedStartTime: target.xPosition,
				duration,
			});
		}
		target.xPosition = fps
			? roundFrameTime({ time: target.xPosition, fps })
			: target.xPosition;

		this.setOver({ dropTarget: target, elementType });
		event.dataTransfer.dropEffect = "copy";
	}

	onDragLeave(event: DragEvent): void {
		event.preventDefault();
		if (this.enterCount === 0) return;
		this.enterCount -= 1;
		if (this.enterCount === 0) {
			this.setIdle();
		}
	}

	onDrop(event: DragEvent): void {
		event.preventDefault();
		this.enterCount = 0;

		const dragData = this.config.dragSource.getActive();
		const hasFiles = event.dataTransfer.files?.length > 0;
		if (!dragData && !hasFiles) return;

		const currentTarget = this.dropTarget;
		this.setIdle();

		try {
			if (dragData) {
				if (!currentTarget) return;
				this.executeAssetDrop({ target: currentTarget, dragData });
				return;
			}

			const coords = this.getMouseTimelineCoords({ event });
			if (!coords) return;
			this.executeFileDrop({
				files: Array.from(event.dataTransfer.files),
				mouseX: coords.mouseX,
				mouseY: coords.mouseY,
			}).catch((error) => {
				console.error("Failed to process file drop:", error);
			});
		} catch (error) {
			console.error("Failed to process drop:", error);
		}
	}

	// --- Private ---

	private setOver(state: {
		dropTarget: DropTarget | null;
		elementType: ElementType | null;
	}): void {
		this.state = { kind: "over", ...state };
		this.notify();
	}

	private setIdle(): void {
		this.state = { kind: "idle" };
		this.notify();
	}

	private notify(): void {
		for (const fn of this.subscribers) fn();
	}

	private getMouseTimelineCoords({
		event,
	}: {
		event: DragEvent;
	}): TimelineCoords | null {
		const scrollContainer = this.config.getTracksScrollEl();
		const referenceRect =
			scrollContainer?.getBoundingClientRect() ??
			this.config.getContainerEl()?.getBoundingClientRect();
		if (!referenceRect) return null;

		const scrollLeft = scrollContainer?.scrollLeft ?? 0;
		const scrollTop = scrollContainer?.scrollTop ?? 0;
		const headerHeight =
			this.config.getHeaderEl()?.getBoundingClientRect().height ?? 0;

		return {
			mouseX: event.clientX - referenceRect.left + scrollLeft,
			mouseY: event.clientY - referenceRect.top + scrollTop - headerHeight,
		};
	}

	// Shared insertion logic — new track vs existing track.
	private insertAtTarget({
		element,
		target,
		trackType,
	}: {
		element: CreateTimelineElement;
		target: DropTarget;
		trackType: TrackType;
	}): void {
		if (target.isNewTrack) {
			this.config.executeCommand(
				new InsertElementCommand({
					element,
					placement: {
						mode: "new-track",
						trackType,
						insertIndex: target.trackIndex,
					},
				}),
			);
			return;
		}

		const tracks = orderedTracks({ sceneTracks: this.config.getSceneTracks() });
		const track = tracks[target.trackIndex];
		if (!track) return;
		this.config.insertElement({
			placement: { mode: "explicit", trackId: track.id },
			element,
		});
	}

	private executeAssetDrop({
		target,
		dragData,
	}: {
		target: DropTarget;
		dragData: TimelineDragData;
	}): void {
		switch (dragData.type) {
			case "text":
				this.executeTextDrop({ target, dragData });
				return;
			case "graphic":
				this.executeGraphicDrop({ target, dragData });
				return;
			case "sticker":
				this.executeStickerDrop({ target, dragData });
				return;
			case "effect":
				this.executeEffectDrop({ target, dragData });
				return;
			case "media":
				this.executeMediaDrop({ target, dragData });
				return;
		}
	}

	private executeTextDrop({
		target,
		dragData,
	}: {
		target: DropTarget;
		dragData: Extract<TimelineDragData, { type: "text" }>;
	}): void {
		const element = buildTextElement({
			raw: {
				name: dragData.name ?? "",
				params: {
					content: dragData.content ?? "",
					...(dragData.fontFamily ? { fontFamily: dragData.fontFamily } : {}),
					...(dragData.fontWeight ? { fontWeight: dragData.fontWeight } : {}),
				},
			},
			startTime: target.xPosition,
		});
		this.insertAtTarget({ element, target, trackType: "text" });
	}

	private executeStickerDrop({
		target,
		dragData,
	}: {
		target: DropTarget;
		dragData: Extract<TimelineDragData, { type: "sticker" }>;
	}): void {
		const element = buildStickerElement({
			stickerId: dragData.stickerId,
			name: dragData.name,
			startTime: target.xPosition,
		});
		this.insertAtTarget({ element, target, trackType: "graphic" });
	}

	private executeGraphicDrop({
		target,
		dragData,
	}: {
		target: DropTarget;
		dragData: Extract<TimelineDragData, { type: "graphic" }>;
	}): void {
		const element = buildGraphicElement({
			definitionId: dragData.definitionId,
			name: dragData.name,
			startTime: target.xPosition,
			params: dragData.params,
		});
		this.insertAtTarget({ element, target, trackType: "graphic" });
	}

	private executeMediaDrop({
		target,
		dragData,
	}: {
		target: DropTarget;
		dragData: Extract<TimelineDragData, { type: "media" }>;
	}): void {
		if (target.targetElement) {
			// Replace media source — not yet implemented
			return;
		}

		const mediaAsset = this.config
			.getMediaAssets()
			.find((asset) => asset.id === dragData.id);
		if (!mediaAsset) return;
		const scroClips = getScroVideos()?.clips;
		if (isScroAssetEditLocked({ asset: mediaAsset, clips: scroClips })) {
			return;
		}
		const isScroMedia =
			resolveScroClipNumber({ asset: mediaAsset, clips: scroClips }) != null;
		if (isScroMedia) {
			const sceneTracks = this.config.getSceneTracks();
			const draft = buildDroppedMediaElement({
				asset: mediaAsset,
				startTime: target.xPosition,
			});
			const nonOverlappingStart = findNonOverlappingMainTrackStartTime({
				mainTrack: sceneTracks.main,
				requestedStartTime: target.xPosition,
				duration: draft.duration,
			});
			this.config.insertElement({
				placement: { mode: "explicit", trackId: sceneTracks.main.id },
				element: {
					...draft,
					startTime: nonOverlappingStart,
				},
			});
			return;
		}

		const trackType: TrackType =
			dragData.mediaType === "audio" ? "audio" : "video";
		const element = buildDroppedMediaElement({
			asset: mediaAsset,
			startTime: target.xPosition,
		});
		this.insertAtTarget({ element, target, trackType });
	}

	private executeEffectDrop({
		target,
		dragData,
	}: {
		target: DropTarget;
		dragData: Extract<TimelineDragData, { type: "effect" }>;
	}): void {
		// The drag preview already snapped this to a clip head, tail, or cut.
		const element = buildEffectElement({
			effectType: dragData.effectType,
			startTime: target.xPosition,
			duration: target.anchoredDuration,
		});
		// Transitions reuse one effect track and are painted on the video row.
		if (isTransitionEffectType(dragData.effectType)) {
			this.config.insertElement({
				placement: { mode: "auto", trackType: "effect" },
				element,
			});
			return;
		}
		this.insertAtTarget({ element, target, trackType: "effect" });
	}

	private async executeFileDrop({
		files,
		mouseX,
		mouseY,
	}: {
		files: File[];
		mouseX: number;
		mouseY: number;
	}): Promise<void> {
		const projectId = this.config.getActiveProjectId();
		if (!projectId) return;

		await showMediaUploadToast({
			filesCount: files.length,
			promise: async () => {
				const processedAssets = await processMediaAssets({ files });

				// Sequential on purpose: each iteration reads getSceneTracks()
				// to decide placement (reuse empty main vs new track) and that
				// decision depends on the effects of prior inserts.
				for (const asset of processedAssets) {
					const createdAsset = await this.config.addMediaAsset({
						projectId,
						asset,
					});
					if (!createdAsset) continue;

					const placed = placementForScroMedia({
						asset: createdAsset,
						clips: getScroVideos()?.clips,
					});
					const duration = toElementDurationTicks({
						seconds: placed?.visibleSeconds ?? createdAsset.duration,
					});

					const sceneTracks = this.config.getSceneTracks();
					const currentTime = this.config.getCurrentPlayheadTime();

					const reuseMainTrackId =
						createdAsset.type !== "audio" &&
						sceneTracks.overlay.length === 0 &&
						sceneTracks.audio.length === 0 &&
						sceneTracks.main.elements.length === 0
							? sceneTracks.main.id
							: null;

					if (reuseMainTrackId) {
						this.config.insertElement({
							placement: { mode: "explicit", trackId: reuseMainTrackId },
							element: buildDroppedMediaElement({
								asset: createdAsset,
								startTime: currentTime,
							}),
						});
						continue;
					}

					const dropTarget = computeDropTarget({
						elementType: createdAsset.type,
						mouseX,
						mouseY,
						tracks: sceneTracks,
						playheadTime: currentTime,
						isExternalDrop: true,
						elementDuration: duration,
						pixelsPerSecond: BASE_TIMELINE_PIXELS_PER_SECOND,
						zoomLevel: this.config.zoomLevel,
					});

					const trackType: TrackType =
						createdAsset.type === "audio" ? "audio" : "video";
					this.insertAtTarget({
						element: buildDroppedMediaElement({
							asset: createdAsset,
							startTime: dropTarget.xPosition,
						}),
						target: dropTarget,
						trackType,
					});
				}

				return {
					uploadedCount: processedAssets.length,
					assetNames: processedAssets.map((asset) => asset.name),
				};
			},
		});
	}
}
