import type { MouseEvent as ReactMouseEvent } from "react";
import {
	buildMoveGroup,
	resolveGroupMove,
	snapGroupEdges,
	type GroupMoveResult,
	type MoveGroup,
} from "@/opencut/timeline/group-move";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/opencut/timeline/scale";
import {
	maxMediaTime,
	type MediaTime,
	mediaTime,
	roundFrameTime,
	subMediaTime,
	TICKS_PER_SECOND,
	ZERO_MEDIA_TIME,
} from "@/opencut/wasm";
import { TIMELINE_DRAG_THRESHOLD_PX } from "@/opencut/timeline/components/interaction";
import type { FrameRate } from "opencut-wasm";
import { computeDropTarget } from "@/opencut/timeline/components/drop-target";
import { getMouseTimeFromClientX } from "@/opencut/timeline/drag-utils";
import { fixedTransitionStart } from "@/opencut/effects/effect-timing";
import { isTransitionElement } from "@/opencut/effects/transition-layout";
import { canPlaceTimeSpansOnTrack } from "@/opencut/timeline/placement/overlap";
import { generateUUID } from "@/opencut/utils/id";
import type { SnapPoint } from "@/opencut/timeline/snapping";
import type {
	DropTarget,
	ElementRef,
	ElementDragView,
	SceneTracks,
	TimelineElement,
	TimelineTrack,
} from "@/opencut/timeline";

const MOUSE_BUTTON_RIGHT = 2;

// --- Config ---

export interface ViewportAdapter {
	getZoomLevel: () => number;
	getTracksScrollEl: () => HTMLDivElement | null;
	getTracksContainerEl: () => HTMLDivElement | null;
	getHeaderEl: () => HTMLElement | null;
}

export interface InputAdapter {
	isShiftHeld: () => boolean;
}

export interface SceneReader {
	getTracks: () => SceneTracks;
	getActiveFps: () => FrameRate | null;
}

export interface ElementSelectionApi {
	getSelected: () => readonly ElementRef[];
	isSelected: (ref: ElementRef) => boolean;
	select: (ref: ElementRef) => void;
	handleClick: (args: ElementRef & { isMultiKey: boolean }) => void;
	clearKeyframeSelection: () => void;
}

export interface PlaybackReader {
	getCurrentTime: () => MediaTime;
}

export interface TimelineOps {
	moveElements: (args: Pick<GroupMoveResult, "moves" | "createTracks">) => void;
}

export interface SnapConfig {
	isEnabled: () => boolean;
	onChange?: (snapPoint: SnapPoint | null) => void;
}

export interface ElementInteractionDeps {
	viewport: ViewportAdapter;
	input: InputAdapter;
	scene: SceneReader;
	selection: ElementSelectionApi;
	playback: PlaybackReader;
	timeline: TimelineOps;
	snap: SnapConfig;
	/** Scro clips: show the clicked element in the center preview and play it. */
	onPreviewElement?: (element: TimelineElement) => void;
	/** True when an element cannot be dragged/edited (e.g., ScroVideo before video is generated). */
	isElementEditLocked?: (element: TimelineElement) => boolean;
	/** True when an element must stay on the main track (#1) and never overlap or open a new track. */
	isElementPinnedToMainTrack?: (element: TimelineElement) => boolean;
}

export interface ElementInteractionDepsRef {
	readonly current: ElementInteractionDeps;
}

// --- Session ---

type Point = { readonly x: number; readonly y: number };

interface MousedownSnapshot {
	readonly origin: Point;
	readonly elementId: string;
	readonly trackId: string;
	readonly startElementTime: MediaTime;
	readonly clickOffsetTime: MediaTime;
	readonly selectedElements: readonly ElementRef[];
}

interface DragProgress {
	moveGroup: MoveGroup;
	// Pre-minted per member so the identity of any "new track" created by
	// this drag stays stable across mousemove-driven drop-target recomputes.
	// `resolveGroupMoveForDrop` runs every mousemove and emits a
	// `createTracks[]` carrying these IDs; downstream consumers (snap
	// indicator, drop-line, commit path) see the same entity every frame
	// instead of a churning UUID.
	reservedNewTrackIds: readonly string[];
	currentTime: MediaTime;
	currentMouseX: number;
	currentMouseY: number;
	groupMoveResult: GroupMoveResult | null;
	dropTarget: DropTarget | null;
}

type Session =
	| { kind: "idle" }
	| { kind: "pending"; mousedown: MousedownSnapshot }
	| { kind: "dragging"; mousedown: MousedownSnapshot; drag: DragProgress };

const IDLE_VIEW: ElementDragView = { kind: "idle" };

// --- Pure helpers ---

function pixelToClickOffsetTime({
	clientX,
	elementRect,
	zoomLevel,
}: {
	clientX: number;
	elementRect: DOMRect;
	zoomLevel: number;
}): MediaTime {
	const clickOffsetX = clientX - elementRect.left;
	const seconds = clickOffsetX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel);
	return mediaTime({ ticks: Math.round(seconds * TICKS_PER_SECOND) });
}

function verticalDirection({
	startMouseY,
	currentMouseY,
}: {
	startMouseY: number;
	currentMouseY: number;
}): "up" | "down" | null {
	if (currentMouseY < startMouseY) return "up";
	if (currentMouseY > startMouseY) return "down";
	return null;
}

function orderedTracks(sceneTracks: SceneTracks): TimelineTrack[] {
	return [...sceneTracks.overlay, sceneTracks.main, ...sceneTracks.audio];
}

function movedPastDragThreshold({
	current,
	origin,
}: {
	current: Point;
	origin: Point;
}): boolean {
	return (
		Math.abs(current.x - origin.x) > TIMELINE_DRAG_THRESHOLD_PX ||
		Math.abs(current.y - origin.y) > TIMELINE_DRAG_THRESHOLD_PX
	);
}

function frameSnappedMouseTime({
	clientX,
	scrollContainer,
	zoomLevel,
	clickOffsetTime,
	fps,
}: {
	clientX: number;
	scrollContainer: HTMLDivElement;
	zoomLevel: number;
	clickOffsetTime: MediaTime;
	fps: FrameRate;
}): MediaTime {
	const mouseTime = getMouseTimeFromClientX({
		clientX,
		containerRect: scrollContainer.getBoundingClientRect(),
		zoomLevel,
		scrollLeft: scrollContainer.scrollLeft,
	});
	const adjusted = maxMediaTime({
		a: ZERO_MEDIA_TIME,
		b: subMediaTime({ a: mouseTime, b: clickOffsetTime }),
	});
	return roundFrameTime({ time: adjusted, fps });
}

/** Transitions stay on a clip head, tail, or cut while the block is dragged. */
function lockedTransitionTime({
	elementId,
	trackId,
	proposedTime,
	tracks,
	fps,
}: {
	elementId: string;
	trackId: string;
	proposedTime: MediaTime;
	tracks: SceneTracks;
	fps: FrameRate;
}): MediaTime | null {
	const ordered = [...tracks.overlay, tracks.main, ...tracks.audio];
	const track = ordered.find((item) => item.id === trackId);
	const element = track?.elements.find((item) => item.id === elementId);
	if (!element || element.type !== "effect") return null;
	const fixed = fixedTransitionStart({
		time: proposedTime,
		tracks,
		effectType: element.effectType,
		duration: element.duration,
	});
	if (fixed === null) return null;
	return roundFrameTime({ time: fixed, fps });
}

/** Keep a transition on its effect track so dragging it does not open a new row. */
function pinnedTransitionDropTarget({
	group,
	tracks,
	snappedTime,
}: {
	group: MoveGroup;
	tracks: SceneTracks;
	snappedTime: MediaTime;
}): DropTarget | null {
	const ordered = orderedTracks(tracks);
	const allTransitions = group.members.every((member) => {
		const track = ordered.find((item) => item.id === member.trackId);
		const element = track?.elements.find((item) => item.id === member.elementId);
		return !!element && isTransitionElement(element);
	});
	if (!allTransitions) return null;
	const trackIndex = ordered.findIndex((item) => item.id === group.anchor.trackId);
	if (trackIndex < 0) return null;
	return {
		trackIndex,
		isNewTrack: false,
		insertPosition: null,
		xPosition: snappedTime,
		targetElement: null,
	};
}

function isMoveGroupEditLocked({
	group,
	tracks,
	isElementEditLocked,
}: {
	group: MoveGroup;
	tracks: SceneTracks;
	isElementEditLocked?: (element: TimelineElement) => boolean;
}): boolean {
	if (!isElementEditLocked) return false;
	const ordered = orderedTracks(tracks);
	return group.members.some((member) => {
		const track = ordered.find((item) => item.id === member.trackId);
		const element = track?.elements.find((item) => item.id === member.elementId);
		return element ? isElementEditLocked(element) : false;
	});
}

function isMoveGroupPinnedToMainTrack({
	group,
	tracks,
	isElementPinnedToMainTrack,
}: {
	group: MoveGroup;
	tracks: SceneTracks;
	isElementPinnedToMainTrack?: (element: TimelineElement) => boolean;
}): boolean {
	if (!isElementPinnedToMainTrack) return false;
	const ordered = orderedTracks(tracks);
	return group.members.some((member) => {
		const track = ordered.find((item) => item.id === member.trackId);
		const element = track?.elements.find((item) => item.id === member.elementId);
		return element ? isElementPinnedToMainTrack(element) : false;
	});
}

/**
 * Clamp a main-track move group's anchor start time so it never overlaps
 * stationary elements on the main track.
 */
export function clampMainTrackGroupTime({
	group,
	tracks,
	originStartTime,
	proposedStartTime,
}: {
	group: MoveGroup;
	tracks: SceneTracks;
	originStartTime: MediaTime;
	proposedStartTime: MediaTime;
}): MediaTime {
	const movingIds = new Set(group.members.map((member) => member.elementId));
	const mainElementsById = new Map(
		tracks.main.elements.map((element) => [element.id, element] as const),
	);
	const mainMembers = group.members.flatMap((member) => {
		const element = mainElementsById.get(member.elementId);
		return element ? [{ member, element }] : [];
	});
	if (mainMembers.length === 0) return proposedStartTime;

	const minOffset = mainMembers.reduce(
		(min, { member }) => Math.min(min, member.timeOffset),
		0,
	);
	const maxEndOffset = mainMembers.reduce(
		(max, { member, element }) =>
			Math.max(max, member.timeOffset + element.duration),
		0,
	);
	const groupSpan = Math.max(0, maxEndOffset - minOffset);
	const minAnchorTime = mediaTime({ ticks: Math.max(0, -minOffset) });
	const candidateAnchorTime = maxMediaTime({
		a: minAnchorTime,
		b: proposedStartTime,
	});

	const stationaryTrack = {
		elements: tracks.main.elements.filter(
			(element) => !movingIds.has(element.id),
		),
	};
	if (stationaryTrack.elements.length === 0) {
		return minAnchorTime;
	}

	const candidateSpans = mainMembers.map(({ member, element }) => ({
		startTime: mediaTime({ ticks: candidateAnchorTime + member.timeOffset }),
		duration: element.duration,
	}));
	if (
		canPlaceTimeSpansOnTrack({
			track: stationaryTrack,
			timeSpans: candidateSpans,
		})
	) {
		return candidateAnchorTime;
	}

	const originGroupStart = originStartTime + minOffset;
	const originGroupEnd = originStartTime + maxEndOffset;
	const leftBound = stationaryTrack.elements
		.filter((el) => el.startTime + el.duration <= originGroupStart)
		.reduce((bound, el) => Math.max(bound, el.startTime + el.duration), 0);
	const rightBound = stationaryTrack.elements
		.filter((el) => el.startTime >= originGroupEnd)
		.reduce(
			(bound, el) => Math.min(bound, el.startTime),
			Number.POSITIVE_INFINITY,
		);

	const maxAllowedGroupStart = Number.isFinite(rightBound)
		? Math.max(leftBound, rightBound - groupSpan)
		: Number.POSITIVE_INFINITY;
	const desiredGroupStart = candidateAnchorTime + minOffset;
	const clampedGroupStart = Math.max(
		leftBound,
		Math.min(desiredGroupStart, maxAllowedGroupStart),
	);
	return mediaTime({ ticks: Math.max(0, clampedGroupStart - minOffset) });
}

/** Keep ScroVideo elements fixed on the main track (#1) so dragging never creates an overlay track. */
function pinnedMainTrackDropTarget({
	group,
	tracks,
	snappedTime,
	isElementPinnedToMainTrack,
}: {
	group: MoveGroup;
	tracks: SceneTracks;
	snappedTime: MediaTime;
	isElementPinnedToMainTrack?: (element: TimelineElement) => boolean;
}): DropTarget | null {
	if (
		!isMoveGroupPinnedToMainTrack({
			group,
			tracks,
			isElementPinnedToMainTrack,
		})
	) {
		return null;
	}
	const ordered = orderedTracks(tracks);
	const trackIndex = ordered.findIndex((item) => item.id === tracks.main.id);
	if (trackIndex < 0) return null;
	return {
		trackIndex,
		isNewTrack: false,
		insertPosition: null,
		xPosition: snappedTime,
		targetElement: null,
	};
}

function resolveDropTarget({
	clientX,
	clientY,
	elementId,
	trackId,
	tracks,
	viewport,
	zoomLevel,
	snappedTime,
	verticalDragDirection,
}: {
	clientX: number;
	clientY: number;
	elementId: string;
	trackId: string;
	tracks: SceneTracks;
	viewport: ViewportAdapter;
	zoomLevel: number;
	snappedTime: MediaTime;
	verticalDragDirection: "up" | "down" | null;
}): DropTarget | null {
	const containerRect = viewport
		.getTracksContainerEl()
		?.getBoundingClientRect();
	const scrollContainer = viewport.getTracksScrollEl();
	if (!containerRect || !scrollContainer) return null;

	const sourceTrack = orderedTracks(tracks).find(({ id }) => id === trackId);
	const movingElement = sourceTrack?.elements.find(
		({ id }) => id === elementId,
	);
	if (!movingElement) return null;

	const scrollRect = scrollContainer.getBoundingClientRect();
	const headerHeight =
		viewport.getHeaderEl()?.getBoundingClientRect().height ?? 0;

	return computeDropTarget({
		elementType: movingElement.type,
		mouseX: clientX - scrollRect.left + scrollContainer.scrollLeft,
		mouseY: clientY - scrollRect.top + scrollContainer.scrollTop - headerHeight,
		tracks,
		playheadTime: snappedTime,
		isExternalDrop: false,
		elementDuration: movingElement.duration,
		pixelsPerSecond: BASE_TIMELINE_PIXELS_PER_SECOND,
		zoomLevel,
		startTimeOverride: snappedTime,
		excludeElementId: movingElement.id,
		verticalDragDirection,
	});
}

function resolveGroupMoveForDrop({
	group,
	tracks,
	anchorStartTime,
	dropTarget,
	reservedNewTrackIds,
	allowNewTracks = true,
}: {
	group: MoveGroup;
	tracks: SceneTracks;
	anchorStartTime: MediaTime;
	dropTarget: DropTarget;
	reservedNewTrackIds: readonly string[];
	allowNewTracks?: boolean;
}): GroupMoveResult | null {
	const newTracksFallback = () =>
		allowNewTracks
			? resolveGroupMove({
					group,
					tracks,
					anchorStartTime,
					target: {
						kind: "newTracks",
						anchorInsertIndex: dropTarget.trackIndex,
						newTrackIds: [...reservedNewTrackIds],
					},
				})
			: null;

	if (dropTarget.isNewTrack) return newTracksFallback();

	const targetTrack = orderedTracks(tracks)[dropTarget.trackIndex];
	if (!targetTrack) return null;

	return (
		resolveGroupMove({
			group,
			tracks,
			anchorStartTime,
			target: { kind: "existingTrack", anchorTargetTrackId: targetTrack.id },
		}) ?? newTracksFallback()
	);
}

// --- Controller ---

export class ElementInteractionController {
	private session: Session = { kind: "idle" };
	// True once the active gesture crossed the drag threshold. Read by
	// onElementClick, which fires after mouseup — by which point the session
	// has already returned to idle, so the "was this a drag?" answer must
	// outlive the session. Reset on the next mousedown.
	private lastGestureWasDrag = false;

	private readonly subscribers = new Set<() => void>();
	private readonly depsRef: ElementInteractionDepsRef;

	constructor(args: { depsRef: ElementInteractionDepsRef }) {
		this.depsRef = args.depsRef;
	}

	private get deps(): ElementInteractionDeps {
		return this.depsRef.current;
	}

	get view(): ElementDragView {
		if (this.session.kind !== "dragging") return IDLE_VIEW;
		const { mousedown, drag } = this.session;
		const memberTimeOffsets = new Map<string, MediaTime>();
		for (const member of drag.moveGroup.members) {
			memberTimeOffsets.set(member.elementId, member.timeOffset);
		}
		return {
			kind: "dragging",
			anchorElementId: mousedown.elementId,
			trackId: mousedown.trackId,
			memberTimeOffsets,
			startMouseX: mousedown.origin.x,
			startMouseY: mousedown.origin.y,
			startElementTime: mousedown.startElementTime,
			clickOffsetTime: mousedown.clickOffsetTime,
			currentTime: drag.currentTime,
			currentMouseX: drag.currentMouseX,
			currentMouseY: drag.currentMouseY,
			dropTarget: drag.dropTarget,
		};
	}

	get isActive(): boolean {
		return this.session.kind !== "idle";
	}

	subscribe(fn: () => void): () => void {
		this.subscribers.add(fn);
		return () => this.subscribers.delete(fn);
	}

	cancel = (): void => {
		this.lastGestureWasDrag = false;
		this.finishSession();
	};

	destroy(): void {
		this.cancel();
		this.subscribers.clear();
	}

	onElementMouseDown = ({
		event,
		element,
		track,
	}: {
		event: ReactMouseEvent;
		element: TimelineElement;
		track: TimelineTrack;
	}): void => {
		// Right-click must not stopPropagation — ContextMenu needs the bubble.
		if (event.button === MOUSE_BUTTON_RIGHT) {
			const ref = { trackId: track.id, elementId: element.id };
			if (!this.deps.selection.isSelected(ref)) {
				this.deps.selection.handleClick({ ...ref, isMultiKey: false });
			}
			return;
		}

		event.stopPropagation();
		this.lastGestureWasDrag = false;

		const ref = { trackId: track.id, elementId: element.id };

		if (event.metaKey || event.ctrlKey || event.shiftKey) {
			this.deps.selection.handleClick({ ...ref, isMultiKey: true });
		}

		const selectedElements = this.deps.selection.isSelected(ref)
			? this.deps.selection.getSelected()
			: [ref];

		this.session = {
			kind: "pending",
			mousedown: {
				origin: { x: event.clientX, y: event.clientY },
				elementId: element.id,
				trackId: track.id,
				startElementTime: element.startTime,
				clickOffsetTime: pixelToClickOffsetTime({
					clientX: event.clientX,
					elementRect: event.currentTarget.getBoundingClientRect(),
					zoomLevel: this.deps.viewport.getZoomLevel(),
				}),
				selectedElements,
			},
		};
		this.activate();
		this.notify();
	};

	onElementClick = ({
		event,
		element,
		track,
	}: {
		event: ReactMouseEvent;
		element: TimelineElement;
		track: TimelineTrack;
	}): void => {
		event.stopPropagation();

		if (this.lastGestureWasDrag) {
			this.lastGestureWasDrag = false;
			return;
		}

		if (event.metaKey || event.ctrlKey || event.shiftKey) return;

		const ref = { trackId: track.id, elementId: element.id };
		if (
			!this.deps.selection.isSelected(ref) ||
			this.deps.selection.getSelected().length > 1
		) {
			this.deps.selection.select(ref);
		} else {
			this.deps.selection.clearKeyframeSelection();
		}
		this.deps.onPreviewElement?.(element);
	};

	private activate(): void {
		document.addEventListener("mousemove", this.handleMouseMove);
		document.addEventListener("mouseup", this.handleMouseUp);
	}

	private deactivate(): void {
		document.removeEventListener("mousemove", this.handleMouseMove);
		document.removeEventListener("mouseup", this.handleMouseUp);
	}

	private notify(): void {
		for (const fn of this.subscribers) fn();
	}

	private finishSession(): void {
		this.session = { kind: "idle" };
		this.deactivate();
		this.deps.snap.onChange?.(null);
		this.notify();
	}

	private snapResult({
		frameSnappedTime,
		group,
	}: {
		frameSnappedTime: MediaTime;
		group: MoveGroup;
	}): { snappedTime: MediaTime; snapPoint: SnapPoint | null } {
		const { snap, input, scene, viewport, playback } = this.deps;

		if (!snap.isEnabled() || input.isShiftHeld()) {
			return { snappedTime: frameSnappedTime, snapPoint: null };
		}

		const result = snapGroupEdges({
			group,
			anchorStartTime: frameSnappedTime,
			tracks: scene.getTracks(),
			playheadTime: playback.getCurrentTime(),
			zoomLevel: viewport.getZoomLevel(),
		});

		return {
			snappedTime: result.snappedAnchorStartTime,
			snapPoint: result.snapPoint,
		};
	}

	private updateDropTarget({
		clientX,
		clientY,
		mousedown,
		drag,
		snappedTime,
	}: {
		clientX: number;
		clientY: number;
		mousedown: MousedownSnapshot;
		drag: DragProgress;
		snappedTime: MediaTime;
	}): void {
		const { scene, viewport, isElementPinnedToMainTrack } = this.deps;
		const tracks = scene.getTracks();
		const zoomLevel = viewport.getZoomLevel();
		const pinnedMain = pinnedMainTrackDropTarget({
			group: drag.moveGroup,
			tracks,
			snappedTime,
			isElementPinnedToMainTrack,
		});

		const anchorDropTarget =
			pinnedTransitionDropTarget({
				group: drag.moveGroup,
				tracks,
				snappedTime,
			}) ??
			pinnedMain ??
			resolveDropTarget({
				clientX,
				clientY,
				elementId: mousedown.elementId,
				trackId: mousedown.trackId,
				tracks,
				viewport,
				zoomLevel,
				snappedTime,
				verticalDragDirection: verticalDirection({
					startMouseY: mousedown.origin.y,
					currentMouseY: clientY,
				}),
			});

		const nextGroupMoveResult = anchorDropTarget
			? resolveGroupMoveForDrop({
					group: drag.moveGroup,
					tracks,
					anchorStartTime: snappedTime,
					dropTarget: anchorDropTarget,
					reservedNewTrackIds: drag.reservedNewTrackIds,
					allowNewTracks: !pinnedMain,
				})
			: null;

		drag.groupMoveResult = nextGroupMoveResult;
		drag.dropTarget =
			!pinnedMain &&
			anchorDropTarget &&
			(anchorDropTarget.isNewTrack || !nextGroupMoveResult)
				? { ...anchorDropTarget, isNewTrack: true }
				: null;
	}

	private handleMouseMove = ({ clientX, clientY }: MouseEvent): void => {
		const scrollContainer = this.deps.viewport.getTracksScrollEl();
		if (!scrollContainer) return;

		if (this.session.kind === "pending") {
			this.beginDragFromPending({
				mousedown: this.session.mousedown,
				clientX,
				clientY,
				scrollContainer,
			});
			return;
		}

		if (this.session.kind === "dragging") {
			this.updateActiveDrag({
				mousedown: this.session.mousedown,
				drag: this.session.drag,
				clientX,
				clientY,
				scrollContainer,
			});
		}
	};

	private beginDragFromPending({
		mousedown,
		clientX,
		clientY,
		scrollContainer,
	}: {
		mousedown: MousedownSnapshot;
		clientX: number;
		clientY: number;
		scrollContainer: HTMLDivElement;
	}): void {
		if (
			!movedPastDragThreshold({
				current: { x: clientX, y: clientY },
				origin: mousedown.origin,
			})
		) {
			return;
		}

		const fps = this.deps.scene.getActiveFps();
		if (!fps) return;

		const tracks = this.deps.scene.getTracks();
		const moveGroup = buildMoveGroup({
			anchorRef: {
				trackId: mousedown.trackId,
				elementId: mousedown.elementId,
			},
			selectedElements: [...mousedown.selectedElements],
			tracks,
		});
		if (!moveGroup) return;
		if (
			isMoveGroupEditLocked({
				group: moveGroup,
				tracks,
				isElementEditLocked: this.deps.isElementEditLocked,
			})
		) {
			return;
		}

		const zoomLevel = this.deps.viewport.getZoomLevel();
		const frameSnappedTime = frameSnappedMouseTime({
			clientX,
			scrollContainer,
			zoomLevel,
			clickOffsetTime: mousedown.clickOffsetTime,
			fps,
		});
		const lockedTime = lockedTransitionTime({
			elementId: mousedown.elementId,
			trackId: mousedown.trackId,
			proposedTime: frameSnappedTime,
			tracks,
			fps,
		});
		const rawSnap =
			lockedTime !== null
				? { snappedTime: lockedTime, snapPoint: null }
				: this.snapResult({
						frameSnappedTime,
						group: moveGroup,
					});
		const snappedTime = isMoveGroupPinnedToMainTrack({
			group: moveGroup,
			tracks,
			isElementPinnedToMainTrack: this.deps.isElementPinnedToMainTrack,
		})
			? clampMainTrackGroupTime({
					group: moveGroup,
					tracks,
					originStartTime: mousedown.startElementTime,
					proposedStartTime: rawSnap.snappedTime,
				})
			: rawSnap.snappedTime;
		const snapPoint = rawSnap.snapPoint;

		// Ensure the anchor is selected before we render the drag — covers the
		// case where the selection store hasn't committed the mousedown-time
		// selection click yet.
		const anchorRef = {
			trackId: mousedown.trackId,
			elementId: mousedown.elementId,
		};
		if (!this.deps.selection.isSelected(anchorRef)) {
			this.deps.selection.select(anchorRef);
		}

		const drag: DragProgress = {
			moveGroup,
			reservedNewTrackIds: moveGroup.members.map(() => generateUUID()),
			currentTime: snappedTime,
			currentMouseX: clientX,
			currentMouseY: clientY,
			groupMoveResult: null,
			dropTarget: null,
		};

		this.session = { kind: "dragging", mousedown, drag };
		this.lastGestureWasDrag = true;

		this.updateDropTarget({
			clientX,
			clientY,
			mousedown,
			drag,
			snappedTime,
		});

		this.deps.snap.onChange?.(snapPoint);
		this.notify();
	}

	private updateActiveDrag({
		mousedown,
		drag,
		clientX,
		clientY,
		scrollContainer,
	}: {
		mousedown: MousedownSnapshot;
		drag: DragProgress;
		clientX: number;
		clientY: number;
		scrollContainer: HTMLDivElement;
	}): void {
		const fps = this.deps.scene.getActiveFps();
		if (!fps) return;

		const frameSnappedTime = frameSnappedMouseTime({
			clientX,
			scrollContainer,
			zoomLevel: this.deps.viewport.getZoomLevel(),
			clickOffsetTime: mousedown.clickOffsetTime,
			fps,
		});
		const tracks = this.deps.scene.getTracks();
		const lockedTime = lockedTransitionTime({
			elementId: mousedown.elementId,
			trackId: mousedown.trackId,
			proposedTime: frameSnappedTime,
			tracks,
			fps,
		});
		const rawSnap =
			lockedTime !== null
				? { snappedTime: lockedTime, snapPoint: null }
				: this.snapResult({
						frameSnappedTime,
						group: drag.moveGroup,
					});
		const snappedTime = isMoveGroupPinnedToMainTrack({
			group: drag.moveGroup,
			tracks,
			isElementPinnedToMainTrack: this.deps.isElementPinnedToMainTrack,
		})
			? clampMainTrackGroupTime({
					group: drag.moveGroup,
					tracks,
					originStartTime: mousedown.startElementTime,
					proposedStartTime: rawSnap.snappedTime,
				})
			: rawSnap.snappedTime;
		const snapPoint = rawSnap.snapPoint;

		drag.currentTime = snappedTime;
		drag.currentMouseX = clientX;
		drag.currentMouseY = clientY;

		this.updateDropTarget({
			clientX,
			clientY,
			mousedown,
			drag,
			snappedTime,
		});

		this.deps.snap.onChange?.(snapPoint);
		this.notify();
	}

	private handleMouseUp = ({ clientX, clientY }: MouseEvent): void => {
		if (this.session.kind === "pending") {
			this.finishSession();
			return;
		}

		if (this.session.kind !== "dragging") return;

		const { mousedown, drag } = this.session;

		// If the drag returned within the click threshold of its origin, treat
		// this as a cancel rather than a commit — the user dragged then put the
		// element back.
		if (
			!movedPastDragThreshold({
				current: { x: clientX, y: clientY },
				origin: mousedown.origin,
			})
		) {
			this.lastGestureWasDrag = false;
			this.finishSession();
			return;
		}

		const { moveGroup, groupMoveResult } = drag;
		if (!groupMoveResult) {
			this.finishSession();
			return;
		}

		const didMove = groupMoveResult.moves.some((move) => {
			const member = moveGroup.members.find(
				(m) => m.elementId === move.elementId,
			);
			const originalStartTime =
				mousedown.startElementTime + (member?.timeOffset ?? 0);
			return (
				member?.trackId !== move.targetTrackId ||
				originalStartTime !== move.newStartTime
			);
		});

		if (didMove || groupMoveResult.createTracks.length > 0) {
			this.deps.timeline.moveElements({
				moves: groupMoveResult.moves,
				createTracks: groupMoveResult.createTracks,
			});
		}

		this.finishSession();
	};
}
