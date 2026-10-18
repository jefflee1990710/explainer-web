"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorCore } from "@/opencut/core";
import { useEditor } from "@/opencut/editor/use-editor";
import { useRafLoop } from "@/opencut/hooks/use-raf-loop";
import { useContainerSize } from "@/opencut/hooks/use-container-size";
import { useFullscreen } from "@/opencut/hooks/use-fullscreen";
import { CanvasRenderer } from "@/opencut/services/renderer/canvas-renderer";
import { TICKS_PER_SECOND } from "@/opencut/wasm";
import type { RootNode } from "@/opencut/services/renderer/nodes/root-node";
import { buildScene } from "@/opencut/services/renderer/scene-builder";
import { PreviewOverlayLayer } from "./overlay-layer";
import { PreviewInteractionOverlay } from "./preview-interaction-overlay";
import { ContextMenu, ContextMenuTrigger } from "@/opencut/components/ui/context-menu";
import type {
	PreviewOverlayControl,
	PreviewOverlayInstance,
} from "@/opencut/preview/overlays";
import { PreviewContextMenu } from "./context-menu";
import { PreviewToolbar } from "./toolbar";
import { MediaLoadingMark } from "@/opencut/components/loading-media-image";
import { ScroPreviewGenerateButton } from "@/opencut/embed/scro-preview-generate-button";
import {
	previewLoadDecision,
	previewSampleRects,
	rgbaRegionIsPainted,
} from "@/opencut/preview/preview-frame-ready";
import {
	PreviewViewportProvider,
	usePreviewViewportState,
} from "./preview-viewport";

function usePreviewSize() {
	const canvasSize = useEditor(
		(e) => e.project.getActive()?.settings.canvasSize,
	);

	return {
		width: canvasSize?.width,
		height: canvasSize?.height,
	};
}

function normalizeWheelDelta({
	delta,
	deltaMode,
	pageSize,
}: {
	delta: number;
	deltaMode: number;
	pageSize: number;
}): number {
	if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
		return delta * 16;
	}

	if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
		return delta * pageSize;
	}

	return delta;
}

/** Media under the playhead. A change means a different clip may still be decoding. */
function previewMediaId(editor: EditorCore): string | null {
	const time = editor.playback.getCurrentTime();
	const element = editor.scenes.getActiveScene().tracks.main.elements.find((item) => {
		if (item.type !== "image" && item.type !== "video") return false;
		return time >= item.startTime && time < item.startTime + item.duration;
	});
	if (!element || !("mediaId" in element)) return null;
	return element.mediaId;
}

/** True while every probe is still the empty background. One painted probe is enough. */
function previewFrameIsEmpty(canvas: HTMLCanvasElement) {
	try {
		const rects = previewSampleRects(canvas.width, canvas.height);
		const first = rects[0];
		if (!first) return false;
		const probe = document.createElement("canvas");
		probe.width = first.size;
		probe.height = first.size;
		const context = probe.getContext("2d", { willReadFrequently: true });
		if (!context) return false;
		for (const rect of rects) {
			context.clearRect(0, 0, rect.size, rect.size);
			context.drawImage(
				canvas,
				rect.x,
				rect.y,
				rect.size,
				rect.size,
				0,
				0,
				rect.size,
				rect.size,
			);
			if (rgbaRegionIsPainted(context.getImageData(0, 0, rect.size, rect.size).data)) {
				return false;
			}
		}
		return true;
	} catch {
		return false;
	}
}

export function PreviewPanel({
	overlayControls,
	overlayInstances,
	onOverlayVisibilityChange,
}: {
	overlayControls: PreviewOverlayControl[];
	overlayInstances: PreviewOverlayInstance[];
	onOverlayVisibilityChange: (params: {
		overlayId: string;
		isVisible: boolean;
	}) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const { toggleFullscreen } = useFullscreen({ containerRef });
	const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
		containerRef.current = node;
		setContainer(node);
	}, []);

	return (
		<div
			ref={handleContainerRef}
			className="panel bg-background relative flex size-full min-h-0 min-w-0 flex-col rounded-none border"
		>
			<PreviewCanvas
				container={container}
				onToggleFullscreen={toggleFullscreen}
				overlayControls={overlayControls}
				overlayInstances={overlayInstances}
				onOverlayVisibilityChange={onOverlayVisibilityChange}
			/>
			<RenderTreeController />
		</div>
	);
}

function RenderTreeController() {
	const editor = useEditor();
	const tracks = useEditor(
		(e) => e.timeline.getPreviewTracks() ?? e.scenes.getActiveScene().tracks,
	);
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const activeProject = useEditor((e) => e.project.getActive());

	const { width, height } = usePreviewSize();

	useEffect(() => {
		if (!activeProject) return;

		const duration = editor.timeline.getTotalDuration();
		const renderTree = buildScene({
			tracks,
			mediaAssets,
			duration,
			canvasSize: { width, height },
			background: activeProject.settings.background,
			isPreview: true,
		});

		editor.renderer.setRenderTree({ renderTree });
	}, [editor, tracks, mediaAssets, activeProject, width, height]);

	return null;
}

function PreviewCanvas({
	container,
	onToggleFullscreen,
	overlayControls,
	overlayInstances,
	onOverlayVisibilityChange,
}: {
	container: HTMLElement | null;
	onToggleFullscreen: () => void;
	overlayControls: PreviewOverlayControl[];
	overlayInstances: PreviewOverlayInstance[];
	onOverlayVisibilityChange: (params: {
		overlayId: string;
		isVisible: boolean;
	}) => void;
}) {
	const canvasMountRef = useRef<HTMLDivElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const lastFrameRef = useRef(-1);
	const lastSceneRef = useRef<RootNode | null>(null);
	const renderingRef = useRef(false);
	const previewLoadingRef = useRef(true);
	const slowTimerRef = useRef(0);
	const emptySinceRef = useRef(0);
	const seenFrameRef = useRef(false);
	const mediaIdRef = useRef<string | null | undefined>(undefined);
	const [previewLoading, setPreviewLoading] = useState(true);
	const waitingForStill = useEditor((editor) => {
		const time = editor.playback.getCurrentTime();
		const scene = editor.scenes.getActiveScene();
		const element = scene.tracks.main.elements.find((item) => {
			if (item.type !== "image" && item.type !== "video") return false;
			return time >= item.startTime && time < item.startTime + item.duration;
		});
		if (!element || !("mediaId" in element)) return false;
		const asset = editor.media.getAssets().find((item) => item.id === element.mediaId);
		return asset?.scroPlaceholder === true;
	});
	const { width: nativeWidth, height: nativeHeight } = usePreviewSize();
	const viewportSize = useContainerSize({ containerRef: viewportRef });
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const renderTree = useEditor((e) => e.renderer.getRenderTree());
	const viewport = usePreviewViewportState({
		canvasHeight: nativeHeight,
		canvasWidth: nativeWidth,
		viewportHeight: viewportSize.height,
		viewportRef,
		viewportWidth: viewportSize.width,
	});
	const { canPan, panByScreenDelta, scaleZoom } = viewport;

	const renderer = useMemo(() => {
		return new CanvasRenderer({
			width: nativeWidth,
			height: nativeHeight,
			fps: activeProject.settings.fps,
		});
	}, [nativeWidth, nativeHeight, activeProject.settings.fps]);

	// Mount the compositor's output canvas directly into the preview. wgpu
	// renders straight into this element, so there is no intermediate copy —
	// the container div owns positioning/styling, the canvas itself fills it.
	useEffect(() => {
		const mount = canvasMountRef.current;
		if (!mount) return;
		const outputCanvas = renderer.getOutputCanvas();
		outputCanvas.style.display = "block";
		outputCanvas.style.width = "100%";
		outputCanvas.style.height = "100%";
		outputCanvas.style.position = "relative";
		outputCanvas.style.zIndex = "0";
		mount.appendChild(outputCanvas);
		return () => {
			if (outputCanvas.parentElement === mount) {
				mount.removeChild(outputCanvas);
			}
		};
	}, [renderer]);

	const render = useCallback(() => {
		if (!renderTree || renderingRef.current) return;

		const renderTime = Math.min(
			editor.playback.getCurrentTime(),
			editor.timeline.getLastFrameTime(),
		);
		const ticksPerFrame = Math.round(
			(TICKS_PER_SECOND * renderer.fps.denominator) / renderer.fps.numerator,
		);
		const frame = Math.floor(renderTime / ticksPerFrame);
		// A new clip may still be decoding. The previous clip's dark frames must not count.
		const mediaId = previewMediaId(editor);
		if (mediaId !== mediaIdRef.current) {
			mediaIdRef.current = mediaId;
			seenFrameRef.current = false;
			emptySinceRef.current = 0;
			lastFrameRef.current = -1;
		}

		if (
			frame === lastFrameRef.current &&
			renderTree === lastSceneRef.current
		) {
			return;
		}

		renderingRef.current = true;
		lastSceneRef.current = renderTree;
		lastFrameRef.current = frame;
		// A fast cached frame stays clear. A slow image or video decode shows loading.
		window.clearTimeout(slowTimerRef.current);
		slowTimerRef.current = window.setTimeout(() => {
			if (previewLoadingRef.current || seenFrameRef.current) return;
			previewLoadingRef.current = true;
			setPreviewLoading(true);
		}, 200);
		renderer
			.render({ node: renderTree, time: renderTime })
			.catch((error) => {
				console.error("Preview frame failed:", error);
			})
			.finally(() => {
				renderingRef.current = false;
				window.clearTimeout(slowTimerRef.current);
				const painted = seenFrameRef.current || !previewFrameIsEmpty(renderer.getOutputCanvas());
				if (!painted && emptySinceRef.current === 0) emptySinceRef.current = performance.now();
				const decision = previewLoadDecision({
					seenFrame: seenFrameRef.current,
					painted,
					emptyForMs: emptySinceRef.current === 0 ? 0 : performance.now() - emptySinceRef.current,
				});
				seenFrameRef.current = decision.seenFrame;
				if (decision.retry) lastFrameRef.current = -1;
				if (decision.showLoading) {
					if (!previewLoadingRef.current) {
						previewLoadingRef.current = true;
						setPreviewLoading(true);
					}
					return;
				}
				if (!previewLoadingRef.current) return;
				previewLoadingRef.current = false;
				setPreviewLoading(false);
			});
	}, [renderer, renderTree, editor]);

	useEffect(() => {
		return () => window.clearTimeout(slowTimerRef.current);
	}, []);

	useRafLoop(render);

	useEffect(() => {
		const container = viewportRef.current;
		if (!container) return;

		let pendingZoomDelta = 0;
		let pendingPanDeltaX = 0;
		let pendingPanDeltaY = 0;
		let zoomRafId: ReturnType<typeof requestAnimationFrame> | null = null;
		let panRafId: ReturnType<typeof requestAnimationFrame> | null = null;

		const onWheel = (event: WheelEvent) => {
			const normalizedDeltaX = normalizeWheelDelta({
				delta: event.deltaX,
				deltaMode: event.deltaMode,
				pageSize: container.clientWidth,
			});
			const normalizedDeltaY = normalizeWheelDelta({
				delta: event.deltaY,
				deltaMode: event.deltaMode,
				pageSize: container.clientHeight,
			});
			const isZoomGesture = event.ctrlKey || event.metaKey;
			if (isZoomGesture) {
				event.preventDefault();
				pendingZoomDelta += normalizedDeltaY;

				if (zoomRafId === null) {
					zoomRafId = requestAnimationFrame(() => {
						const cappedDelta =
							Math.sign(pendingZoomDelta) *
							Math.min(Math.abs(pendingZoomDelta), 30);
						const zoomFactor = Math.exp(-cappedDelta / 300);

						scaleZoom({ factor: zoomFactor });
						pendingZoomDelta = 0;
						zoomRafId = null;
					});
				}

				return;
			}

			if (!canPan) {
				return;
			}

			if (normalizedDeltaX === 0 && normalizedDeltaY === 0) {
				return;
			}

			event.preventDefault();
			pendingPanDeltaX += normalizedDeltaX;
			pendingPanDeltaY += normalizedDeltaY;

			if (panRafId === null) {
				panRafId = requestAnimationFrame(() => {
					panByScreenDelta({
						deltaX: pendingPanDeltaX,
						deltaY: pendingPanDeltaY,
					});
					pendingPanDeltaX = 0;
					pendingPanDeltaY = 0;
					panRafId = null;
				});
			}
		};

		container.addEventListener("wheel", onWheel, {
			capture: true,
			passive: false,
		});

		return () => {
			container.removeEventListener("wheel", onWheel, {
				capture: true,
			});
			if (zoomRafId !== null) {
				cancelAnimationFrame(zoomRafId);
			}
			if (panRafId !== null) {
				cancelAnimationFrame(panRafId);
			}
		};
	}, [canPan, panByScreenDelta, scaleZoom]);

	return (
		<PreviewViewportProvider value={viewport}>
			<div className="flex size-full min-h-0 min-w-0 flex-col">
				<div className="flex min-h-0 min-w-0 flex-1 p-2 pb-0">
					<ContextMenu>
						<ContextMenuTrigger asChild>
							<div
								ref={viewportRef}
								className="relative flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden"
							>
							<div
								ref={canvasMountRef}
								className="absolute block border"
								style={{
									left: viewport.sceneLeft,
									top: viewport.sceneTop,
									width: viewport.sceneWidth,
									height: viewport.sceneHeight,
									background:
										activeProject.settings.background.type === "blur"
											? "transparent"
											: activeProject?.settings.background.color,
								}}
							>
								{previewLoading || waitingForStill ? (
									<MediaLoadingMark
										className={
											waitingForStill
												? "z-20 bg-[#f4f4f5] text-muted-foreground"
												: "z-20 bg-black/45 text-white"
										}
										spinnerClassName="size-6"
									/>
								) : null}
							</div>
								<PreviewOverlayLayer
									instances={overlayInstances}
									plane="under-interaction"
								/>
								<PreviewInteractionOverlay />
								<PreviewOverlayLayer
									instances={overlayInstances}
									plane="over-interaction"
								/>
								{previewLoading || waitingForStill ? null : (
									<ScroPreviewGenerateButton
										scene={{
											left: viewport.sceneLeft,
											top: viewport.sceneTop,
											width: viewport.sceneWidth,
											height: viewport.sceneHeight,
										}}
									/>
								)}
							</div>
						</ContextMenuTrigger>
						<PreviewContextMenu
							onToggleFullscreen={onToggleFullscreen}
							container={container}
							overlayControls={overlayControls}
							onOverlayVisibilityChange={onOverlayVisibilityChange}
						/>
					</ContextMenu>
				</div>
				<PreviewToolbar onToggleFullscreen={onToggleFullscreen} />
			</div>
		</PreviewViewportProvider>
	);
}
