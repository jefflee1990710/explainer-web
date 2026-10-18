import {
	Command,
	createElementSelectionResult,
	type CommandResult,
} from "@/opencut/commands/base-command";
import { EditorCore } from "@/opencut/core";
import type { SceneTracks, TimelineElement } from "@/opencut/timeline";
import type { ElementClipboardItem } from "@/opencut/clipboard";
import { generateUUID } from "@/opencut/utils/id";
import {
	isScroClipEditLocked,
	isScroElement,
} from "@/opencut/embed/scro-clip-number";
import { getScroVideos } from "@/opencut/embed/scro-video-store";
import {
	applyPlacement,
	findNonOverlappingMainTrackStartTime,
	resolveTrackPlacement,
	enforceMainTrackStart,
} from "@/opencut/timeline/placement";
import { cloneAnimations } from "@/opencut/animation";
import {
	addMediaTime,
	type MediaTime,
	maxMediaTime,
	subMediaTime,
	ZERO_MEDIA_TIME,
} from "@/opencut/wasm";

export class PasteCommand extends Command {
	private savedState: SceneTracks | null = null;
	private pastedElements: { trackId: string; elementId: string }[] = [];
	private readonly time: MediaTime;
	private readonly clipboardItems: ElementClipboardItem[];

	constructor({
		time,
		clipboardItems,
	}: {
		time: MediaTime;
		clipboardItems: ElementClipboardItem[];
	}) {
		super();
		this.time = time;
		this.clipboardItems = clipboardItems;
	}

	execute(): CommandResult | undefined {
		if (this.clipboardItems.length === 0) return undefined;

		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;
		this.pastedElements = [];

		const minStart = this.clipboardItems.reduce(
			(earliestStartTime, item) =>
				item.element.startTime < earliestStartTime
					? item.element.startTime
					: earliestStartTime,
			this.clipboardItems[0].element.startTime,
		);

		let updatedTracks = this.savedState;
		const assets = editor.media.getAssets();
		const clips = getScroVideos()?.clips;
		const editableClipboardItems = this.clipboardItems.filter(
			(item) =>
				!isScroClipEditLocked({
					element: item.element,
					assets,
					clips,
				}),
		);
		if (editableClipboardItems.length === 0) return undefined;

		const itemsByTrackId = groupClipboardItemsByTrackId({
			clipboardItems: editableClipboardItems,
		});

		for (const [trackId, items] of itemsByTrackId) {
			const builtElements = buildPastedElements({
				items,
				minStart,
				time: this.time,
			});

			if (builtElements.length === 0) {
				continue;
			}

			const mainPinnedElements = builtElements.filter((element) =>
				isScroElement({ element, assets, clips }),
			);
			const elementsToAdd = builtElements.filter(
				(element) => !isScroElement({ element, assets, clips }),
			);

			for (const element of mainPinnedElements) {
				const startTime = findNonOverlappingMainTrackStartTime({
					mainTrack: updatedTracks.main,
					requestedStartTime: element.startTime,
					duration: element.duration,
				});
				const placedElement = { ...element, startTime };
				const applied = applyPlacement({
					tracks: updatedTracks,
					placementResult: {
						kind: "existingTrack",
						trackId: updatedTracks.main.id,
						trackIndex: updatedTracks.overlay.length,
						trackType: "video",
					},
					elements: [placedElement],
				});
				if (!applied) continue;
				updatedTracks = applied.updatedTracks;
				this.pastedElements.push({
					trackId: applied.targetTrackId,
					elementId: placedElement.id,
				});
			}

			if (elementsToAdd.length === 0) {
				continue;
			}

			const trackType = items[0].trackType;
			const sourceTrackIndex = [
				...updatedTracks.overlay,
				updatedTracks.main,
				...updatedTracks.audio,
			].findIndex((track) => track.id === trackId);
			const placementResult = resolveTrackPlacement({
				tracks: updatedTracks,
				trackType,
				timeSpans: elementsToAdd.map((element) => ({
					startTime: element.startTime,
					duration: element.duration,
				})),
				strategy: { type: "aboveSource", sourceTrackIndex },
			});
			if (!placementResult) {
				continue;
			}

			let elementsForPlacement = elementsToAdd;
			if (placementResult.kind === "existingTrack") {
				const targetTrack =
					placementResult.trackIndex < updatedTracks.overlay.length
						? updatedTracks.overlay[placementResult.trackIndex]
						: placementResult.trackIndex === updatedTracks.overlay.length
							? updatedTracks.main
							: updatedTracks.audio[
									placementResult.trackIndex - updatedTracks.overlay.length - 1
								];
				if (targetTrack?.id === updatedTracks.main.id) {
					const earliestElement = elementsToAdd.reduce((earliest, element) =>
						element.startTime < earliest.startTime ? element : earliest,
					);
					const adjustedEarliestStartTime = enforceMainTrackStart({
						tracks: updatedTracks,
						targetTrackId: targetTrack.id,
						requestedStartTime: earliestElement.startTime,
					});
					const delta = subMediaTime({
						a: adjustedEarliestStartTime,
						b: earliestElement.startTime,
					});

					if (delta !== ZERO_MEDIA_TIME) {
						elementsForPlacement = elementsToAdd.map((element) => ({
							...element,
							startTime: maxMediaTime({
								a: ZERO_MEDIA_TIME,
								b: addMediaTime({ a: element.startTime, b: delta }),
							}),
						}));
					}
				}
			}

			const applied = applyPlacement({
				tracks: updatedTracks,
				placementResult,
				elements: elementsForPlacement,
			});
			if (!applied) {
				continue;
			}

			updatedTracks = applied.updatedTracks;

			for (const element of elementsForPlacement) {
				this.pastedElements.push({
					trackId: applied.targetTrackId,
					elementId: element.id,
				});
			}
		}

		editor.timeline.updateTracks(updatedTracks);

		if (this.pastedElements.length > 0) {
			return createElementSelectionResult(this.pastedElements);
		}
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}

	getPastedElements(): { trackId: string; elementId: string }[] {
		return this.pastedElements;
	}
}

function groupClipboardItemsByTrackId({
	clipboardItems,
}: {
	clipboardItems: ElementClipboardItem[];
}): Map<string, ElementClipboardItem[]> {
	const groupedItems = new Map<string, ElementClipboardItem[]>();

	for (const item of clipboardItems) {
		const existingItems = groupedItems.get(item.trackId) ?? [];
		groupedItems.set(item.trackId, [...existingItems, item]);
	}

	return groupedItems;
}

function buildPastedElements({
	items,
	minStart,
	time,
}: {
	items: ElementClipboardItem[];
	minStart: MediaTime;
	time: MediaTime;
}): TimelineElement[] {
	const elementsToAdd: TimelineElement[] = [];

	for (const item of items) {
		const relativeOffset = subMediaTime({
			a: item.element.startTime,
			b: minStart,
		});
		const startTime = maxMediaTime({
			a: ZERO_MEDIA_TIME,
			b: addMediaTime({ a: time, b: relativeOffset }),
		});
		const newElementId = generateUUID();

		elementsToAdd.push({
			...item.element,
			id: newElementId,
			startTime,
			animations: cloneAnimations({
				animations: item.element.animations,
				shouldRegenerateKeyframeIds: true,
			}),
		} as TimelineElement);
	}

	return elementsToAdd;
}
