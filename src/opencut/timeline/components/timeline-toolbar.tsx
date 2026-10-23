import { useEditor } from "@/opencut/editor/use-editor";
import { isScroClipEditLocked } from "@/opencut/embed/scro-clip-number";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import { useElementSelection } from "@/opencut/timeline/hooks/element/use-element-selection";
import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/opencut/components/ui/tooltip";
import { Button } from "@/opencut/components/ui/button";
import {
	SplitButton,
	SplitButtonLeft,
	SplitButtonRight,
	SplitButtonSeparator,
} from "@/opencut/components/ui/split-button";
import { Slider } from "@/opencut/components/ui/slider";
import { TIMELINE_ZOOM_BUTTON_FACTOR } from "./interaction";
import { TIMELINE_ZOOM_MAX } from "@/opencut/timeline/scale";
import { sliderToZoom, zoomToSlider } from "@/opencut/timeline/zoom-utils";
import { ScenesView } from "@/opencut/components/editor/scenes-view";
import { type TActionWithOptionalArgs, invokeAction } from "@/opencut/actions";
import {
	canToggleSourceAudio,
	getSourceAudioActionLabel,
	isSourceAudioSeparated,
} from "@/opencut/timeline/audio-separation";
import { hasMediaId } from "@/opencut/timeline";
import { cn } from "@/opencut/utils/ui";
import { useTimelineStore } from "@/opencut/timeline/timeline-store";
import { ScrollArea } from "@/opencut/components/ui/scroll-area";
import {
	Bookmark02Icon,
	Delete02Icon,
	SnowIcon,
	ScissorIcon,
	MagnetIcon,
	SearchAddIcon,
	SearchMinusIcon,
	Copy01Icon,
	AlignLeftIcon,
	AlignRightIcon,
	Link02Icon,
	Layers01Icon,
	Chart03Icon,
	Unlink02Icon,
	MagicWand05Icon,
	Image02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { OcRippleIcon } from "@/opencut/components/icons";
import { GraphEditorPopover } from "./graph-editor/popover";
import { PopoverTrigger } from "@/opencut/components/ui/popover";
import { useGraphEditorController } from "./graph-editor/use-controller";
import { useState } from "react";
import { toast } from "sonner";
import { createMediaInputSource, probeVideoSpeechBoundsFromSource } from "@/opencut/embed/scro-media-load";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import {
	useScroSubtitleCatalog,
	useScroSubtitleVideoId,
} from "@/opencut/embed/scro-subtitle-store";
import { runAutoInsertBrollOnTimeline } from "@/opencut/components/editor/panels/assets/views/stock-media-view";

export function TimelineToolbar({
	zoomLevel,
	minZoom,
	setZoomLevel,
}: {
	zoomLevel: number;
	minZoom: number;
	setZoomLevel: ({ zoom }: { zoom: number }) => void;
}) {
	const handleZoom = ({ direction }: { direction: "in" | "out" }) => {
		const newZoomLevel =
			direction === "in"
				? Math.min(TIMELINE_ZOOM_MAX, zoomLevel * TIMELINE_ZOOM_BUTTON_FACTOR)
				: Math.max(minZoom, zoomLevel / TIMELINE_ZOOM_BUTTON_FACTOR);
		setZoomLevel({ zoom: newZoomLevel });
	};

	return (
		<ScrollArea className="scrollbar-hidden">
			<div className="flex h-10 items-center justify-between border-b px-2 py-1">
				<ToolbarLeftSection />

				<SceneSelector />

				<ToolbarRightSection
					zoomLevel={zoomLevel}
					minZoom={minZoom}
					onZoomChange={(zoom) => setZoomLevel({ zoom })}
					onZoom={handleZoom}
				/>
			</div>
		</ScrollArea>
	);
}

function ToolbarLeftSection() {
	const editor = useEditor();
	const mediaAssets = useEditor((currentEditor) =>
		currentEditor.media.getAssets(),
	);
	const scroVideos = useScroVideos();
	const subtitleCatalog = useScroSubtitleCatalog();
	const subtitleVideoId = useScroSubtitleVideoId();
	const { selectedElements } = useElementSelection();
	const graphEditor = useGraphEditorController();
	const [smoothingPauses, setSmoothingPauses] = useState(false);
	const [insertingBroll, setInsertingBroll] = useState(false);
	const isCurrentlyBookmarked = useEditor((e) =>
		e.scenes.isBookmarked({ time: e.playback.getCurrentTime() }),
	);

	const handleAutoInsertBroll = async () => {
		if (insertingBroll) return;
		const lines = subtitleCatalog?.lines ?? [];
		if (lines.length === 0) {
			toast.info("這支影片尚無對白可分析 B-Roll 插圖");
			return;
		}
		setInsertingBroll(true);
		try {
			const res = await runAutoInsertBrollOnTimeline({
				editor,
				lines,
				videoId: subtitleVideoId ?? scroVideos?.videoId,
				mediaType: "image",
			});
			if (res.error) {
				toast.error(res.error);
			} else {
				toast.success(`已自動在中間加插 ${res.insertedCount} 段 B-Roll 插圖！`);
			}
		} catch {
			toast.error("自動加插 B-Roll 失敗");
		} finally {
			setInsertingBroll(false);
		}
	};

	const handleSmoothSilenceGaps = async () => {
		if (smoothingPauses) return;
		const scene = editor.scenes.getActiveScene();
		const mainElements = [...scene.tracks.main.elements].sort(
			(a, b) => a.startTime - b.startTime,
		);
		const videoCount = mainElements.filter((el) => el.type === "video").length;
		if (videoCount === 0) {
			toast.info("No video clips on the main track yet");
			return;
		}

		setSmoothingPauses(true);
		try {
			const assets = editor.media.getAssets();
			const byId = new Map(assets.map((a) => [a.id, a]));
			const trimBoundsByAssetId = new Map<
				string,
				{ duration: number; trimStart: number; trimEnd: number }
			>();

			for (const el of mainElements) {
				if (el.type !== "video" || trimBoundsByAssetId.has(el.mediaId)) continue;
				const asset = byId.get(el.mediaId);
				if (!asset) continue;
				if (
					asset.duration &&
					(asset.speechTrimStart !== undefined || asset.speechTrimEnd !== undefined)
				) {
					trimBoundsByAssetId.set(asset.id, {
						duration: asset.duration,
						trimStart: asset.speechTrimStart ?? 0,
						trimEnd: asset.speechTrimEnd ?? 0,
					});
					continue;
				}
				const probed = await probeVideoSpeechBoundsFromSource(
					createMediaInputSource({ file: asset.file, url: asset.url }),
				);
				const dur = probed.duration ?? asset.duration ?? mediaTimeToSeconds({ time: el.duration });
				trimBoundsByAssetId.set(asset.id, {
					duration: dur,
					trimStart: probed.speechTrimStart ?? 0,
					trimEnd: probed.speechTrimEnd ?? 0,
				});
			}

			let cursorSeconds = 0;
			let trimmedClipsCount = 0;
			const updates: Array<{
				trackId: string;
				elementId: string;
				patch: Record<string, unknown>;
			}> = [];

			for (const el of mainElements) {
				if (el.type === "video") {
					const bounds = trimBoundsByAssetId.get(el.mediaId);
					if (bounds && bounds.duration > 0) {
						const trimStart = Math.max(0, Math.min(bounds.duration - 0.5, bounds.trimStart));
						const trimEnd = Math.max(
							0,
							Math.min(bounds.duration - trimStart - 0.5, bounds.trimEnd),
						);
						const visible = Math.max(
							0.5,
							Math.round((bounds.duration - trimStart - trimEnd) * 1000) / 1000,
						);
						if (trimStart > 0.04 || trimEnd > 0.04) {
							trimmedClipsCount++;
						}
						updates.push({
							trackId: scene.tracks.main.id,
							elementId: el.id,
							patch: {
								startTime: mediaTimeFromSeconds({ seconds: cursorSeconds }),
								duration: mediaTimeFromSeconds({ seconds: visible }),
								trimStart: mediaTimeFromSeconds({ seconds: trimStart }),
								trimEnd: mediaTimeFromSeconds({ seconds: trimEnd }),
								sourceDuration: mediaTimeFromSeconds({ seconds: bounds.duration }),
							},
						});
						cursorSeconds += visible;
						continue;
					}
				}
				const durSec = mediaTimeToSeconds({ time: el.duration });
				updates.push({
					trackId: scene.tracks.main.id,
					elementId: el.id,
					patch: {
						startTime: mediaTimeFromSeconds({ seconds: cursorSeconds }),
					},
				});
				cursorSeconds += durSec;
			}

			if (updates.length > 0) {
				editor.timeline.updateElements({
					pushHistory: true,
					updates,
				});
				armScroSync();
			}
			toast.success(
				trimmedClipsCount > 0
					? `已平滑 ${trimmedClipsCount} 段影片接口靜音停頓`
					: "已完成片段接口對齊（未偵測到多餘前後靜音）",
			);
		} catch (error) {
			console.error("Failed to smooth silence gaps:", error);
			toast.error("平滑靜音接口失敗");
		} finally {
			setSmoothingPauses(false);
		}
	};
	const selectedElementsWithTracks = editor.timeline.getElementsWithTracks({
		elements: selectedElements,
	});
	const hasEditLockedSelection = selectedElementsWithTracks.some(({ element }) =>
		isScroClipEditLocked({
			element,
			assets: mediaAssets,
			clips: scroVideos?.clips,
		}),
	);
	const selectedElement =
		selectedElements.length === 1
			? (selectedElementsWithTracks[0] ?? null)
			: null;
	const selectedMediaAsset = (() => {
		if (!selectedElement) {
			return null;
		}

		const { element } = selectedElement;
		if (!hasMediaId(element)) {
			return null;
		}

		return mediaAssets.find((asset) => asset.id === element.mediaId) ?? null;
	})();
	const canToggleSelectedSourceAudio =
		!hasEditLockedSelection &&
		!!selectedElement &&
		canToggleSourceAudio(selectedElement.element, selectedMediaAsset);
	const sourceAudioLabel =
		selectedElement?.element.type === "video"
			? getSourceAudioActionLabel({
					element: selectedElement.element,
				})
			: "Extract audio";
	const isSelectedSourceAudioSeparated =
		selectedElement?.element.type === "video" &&
		isSourceAudioSeparated({
			element: selectedElement.element,
		});

	const handleAction = ({
		action,
		event,
	}: {
		action: TActionWithOptionalArgs;
		event: React.MouseEvent;
	}) => {
		event.stopPropagation();
		invokeAction(action);
	};

	return (
		<div className="flex items-center gap-1">
			<TooltipProvider delayDuration={500}>
				<ToolbarButton
					icon={<HugeiconsIcon icon={ScissorIcon} />}
					tooltip="Split element"
					disabled={hasEditLockedSelection}
					onClick={({ event }) => handleAction({ action: "split", event })}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignLeftIcon} />}
					tooltip="Split left"
					disabled={hasEditLockedSelection}
					onClick={({ event }) => handleAction({ action: "split-left", event })}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignRightIcon} />}
					tooltip="Split right"
					disabled={hasEditLockedSelection}
					onClick={({ event }) =>
						handleAction({ action: "split-right", event })
					}
				/>

				<ToolbarButton
					icon={
						<HugeiconsIcon
							icon={isSelectedSourceAudioSeparated ? Unlink02Icon : Link02Icon}
						/>
					}
					tooltip={sourceAudioLabel}
					disabled={!canToggleSelectedSourceAudio}
					onClick={({ event }) =>
						handleAction({ action: "toggle-source-audio", event })
					}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Copy01Icon} />}
					tooltip="Duplicate element"
					disabled={hasEditLockedSelection}
					onClick={({ event }) =>
						handleAction({ action: "duplicate-selected", event })
					}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={SnowIcon} />}
					tooltip="Freeze frame (coming soon)"
					disabled={true}
					onClick={({ event: _event }) => {}}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					tooltip="Delete element"
					disabled={hasEditLockedSelection}
					onClick={({ event }) =>
						handleAction({ action: "delete-selected", event })
					}
				/>

				<div className="bg-border mx-1 h-6 w-px" />

				<Tooltip>
					<ToolbarButton
						icon={<HugeiconsIcon icon={Bookmark02Icon} />}
						isActive={isCurrentlyBookmarked}
						tooltip={isCurrentlyBookmarked ? "Remove bookmark" : "Add bookmark"}
						onClick={({ event }) =>
							handleAction({ action: "toggle-bookmark", event })
						}
					/>
				</Tooltip>

				<ToolbarButton
					icon={<HugeiconsIcon icon={MagicWand05Icon} />}
					isActive={smoothingPauses}
					disabled={smoothingPauses}
					tooltip="平滑接口停頓 · Smooth clip silence pauses"
					onClick={() => void handleSmoothSilenceGaps()}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Image02Icon} />}
					isActive={insertingBroll}
					disabled={insertingBroll}
					tooltip="自動加入中間 B-Roll 插圖 · Auto insert B-Roll overlays"
					onClick={() => void handleAutoInsertBroll()}
				/>

				<GraphEditorPopover
					open={graphEditor.open}
					onOpenChange={graphEditor.onOpenChange}
					value={
						graphEditor.state.status === "ready"
							? graphEditor.state.cubicBezier
							: null
					}
					message={graphEditor.state.message}
					componentOptions={graphEditor.state.componentOptions}
					activeComponentKey={graphEditor.state.activeComponentKey}
					onActiveComponentKeyChange={graphEditor.onActiveComponentKeyChange}
					onPreviewValue={graphEditor.onPreviewValue}
					onCommitValue={graphEditor.onCommitValue}
					onCancelPreview={graphEditor.onCancelPreview}
				>
					<ToolbarButton
						icon={<HugeiconsIcon icon={Chart03Icon} />}
						tooltip={graphEditor.tooltip}
						disabled={!graphEditor.canOpen}
						buttonWrapper={(button) =>
							graphEditor.canOpen ? (
								<PopoverTrigger asChild>{button}</PopoverTrigger>
							) : (
								button
							)
						}
					/>
				</GraphEditorPopover>
			</TooltipProvider>
		</div>
	);
}

function SceneSelector() {
	const editor = useEditor();
	const currentScene = editor.scenes.getActiveScene();

	return (
		<div>
			<SplitButton className="border-foreground/10 border">
				<SplitButtonLeft>{currentScene?.name || "No Scene"}</SplitButtonLeft>
				<SplitButtonSeparator />
				<ScenesView>
					<SplitButtonRight onClick={() => {}}>
						<HugeiconsIcon icon={Layers01Icon} className="size-4" />
					</SplitButtonRight>
				</ScenesView>
			</SplitButton>
		</div>
	);
}

function ToolbarRightSection({
	zoomLevel,
	minZoom,
	onZoomChange,
	onZoom,
}: {
	zoomLevel: number;
	minZoom: number;
	onZoomChange: (zoom: number) => void;
	onZoom: (options: { direction: "in" | "out" }) => void;
}) {
	const snappingEnabled = useTimelineStore((s) => s.snappingEnabled);
	const rippleEditingEnabled = useTimelineStore((s) => s.rippleEditingEnabled);
	const toggleSnapping = useTimelineStore((s) => s.toggleSnapping);
	const toggleRippleEditing = useTimelineStore((s) => s.toggleRippleEditing);

	return (
		<div className="flex items-center gap-1">
			<TooltipProvider delayDuration={500}>
				<ToolbarButton
					icon={<HugeiconsIcon icon={MagnetIcon} />}
					isActive={snappingEnabled}
					tooltip="Auto snapping"
					onClick={() => toggleSnapping()}
				/>

				<ToolbarButton
					icon={<OcRippleIcon size={24} className="scale-110" />}
					isActive={rippleEditingEnabled}
					tooltip="Ripple editing"
					onClick={() => toggleRippleEditing()}
				/>
			</TooltipProvider>

			<div className="bg-border mx-1 h-6 w-px" />

			<div className="flex items-center gap-1">
				<Button
					variant="text"
					size="icon"
					onClick={() => onZoom({ direction: "out" })}
				>
					<HugeiconsIcon icon={SearchMinusIcon} />
				</Button>
				<Slider
					className="w-28"
					value={[zoomToSlider({ zoomLevel, minZoom })]}
					onValueChange={(values) =>
						onZoomChange(sliderToZoom({ sliderPosition: values[0], minZoom }))
					}
					min={0}
					max={1}
					step={0.005}
				/>
				<Button
					variant="text"
					size="icon"
					onClick={() => onZoom({ direction: "in" })}
				>
					<HugeiconsIcon icon={SearchAddIcon} />
				</Button>
			</div>
		</div>
	);
}

function ToolbarButton({
	icon,
	tooltip,
	onClick,
	disabled,
	isActive,
	buttonWrapper,
}: {
	icon: React.ReactNode;
	tooltip: string;
	onClick?: ({ event }: { event: React.MouseEvent }) => void;
	disabled?: boolean;
	isActive?: boolean;
	buttonWrapper?: (button: React.ReactElement) => React.ReactElement;
}) {
	const button = (
		<Button
			variant={isActive ? "secondary" : "text"}
			size="icon"
			disabled={disabled}
			onClick={onClick ? (event) => onClick({ event }) : undefined}
			className={cn(
				"rounded-sm",
				disabled ? "cursor-not-allowed opacity-50" : "",
			)}
		>
			{icon}
		</Button>
	);
	const trigger = disabled ? (
		<span className="inline-flex">{button}</span>
	) : buttonWrapper ? (
		buttonWrapper(button)
	) : (
		button
	);

	return (
		<Tooltip delayDuration={200}>
			<TooltipTrigger asChild>{trigger}</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
