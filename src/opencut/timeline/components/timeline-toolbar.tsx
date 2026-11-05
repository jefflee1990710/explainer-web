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
	HeadphonesIcon,
	MusicNote03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { OcRippleIcon } from "@/opencut/components/icons";
import { GraphEditorPopover } from "./graph-editor/popover";
import { PopoverTrigger } from "@/opencut/components/ui/popover";
import { useGraphEditorController } from "./graph-editor/use-controller";
import { useState } from "react";
import { toast } from "sonner";
import {
	runAutoInsertBgmOnTimeline,
	runAutoInsertSfxOnTimeline,
} from "@/opencut/embed/scro-auto-audio";
import { runSmoothSilenceGapsOnTimeline } from "@/opencut/embed/scro-smooth-silence";
import {
	useScroSubtitleCatalog,
} from "@/opencut/embed/scro-subtitle-store";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import { resolveAutoAudioLines } from "@/service/opencut/auto-audio-shared";

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
	const { oc } = useOpencutI18n();
	const mediaAssets = useEditor((currentEditor) =>
		currentEditor.media.getAssets(),
	);
	const scroVideos = useScroVideos();
	const subtitleCatalog = useScroSubtitleCatalog();
	const { selectedElements } = useElementSelection();
	const graphEditor = useGraphEditorController();
	const [smoothingPauses, setSmoothingPauses] = useState(false);
	const [addingSfx, setAddingSfx] = useState(false);
	const [addingBgm, setAddingBgm] = useState(false);
	const isCurrentlyBookmarked = useEditor((e) =>
		e.scenes.isBookmarked({ time: e.playback.getCurrentTime() }),
	);
	const autoAudioLines = resolveAutoAudioLines(
		subtitleCatalog?.lines,
		scroVideos?.clips,
	);

	const handleAutoInsertSfx = async () => {
		if (addingSfx) return;
		setAddingSfx(true);
		try {
			const res = await runAutoInsertSfxOnTimeline({
				editor,
				lines: autoAudioLines,
			});
			if (res.error) {
				toast.error(res.error);
			} else {
				toast.success(`已自動加入 ${res.insertedCount} 段聲效`);
			}
		} catch {
			toast.error("自動加入聲效失敗");
		} finally {
			setAddingSfx(false);
		}
	};

	const handleAutoInsertBgm = async () => {
		if (addingBgm) return;
		setAddingBgm(true);
		try {
			const firstClip = scroVideos?.clips?.[0];
			const res = await runAutoInsertBgmOnTimeline({
				editor,
				lines: autoAudioLines,
				title:
					firstClip?.englishVo?.slice(0, 40) ||
					firstClip?.name?.slice(0, 40),
			});
			if (res.error) {
				toast.error(res.error);
			} else {
				const mood = res.selection?.mood ?? "ambient";
				toast.success(`已自動加入背景音樂（${mood}）`);
			}
		} catch {
			toast.error("自動加入背景音樂失敗");
		} finally {
			setAddingBgm(false);
		}
	};

	const handleSmoothSilenceGaps = async () => {
		if (smoothingPauses) return;
		setSmoothingPauses(true);
		try {
			const res = await runSmoothSilenceGapsOnTimeline({ editor });
			if (res.error) {
				toast.info(res.error);
				return;
			}
			toast.success(
				res.trimmedClipsCount > 0
					? `已平滑 ${res.trimmedClipsCount} 段影片接口靜音停頓`
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
	const isSelectedSourceAudioSeparated =
		selectedElement?.element.type === "video" &&
		isSourceAudioSeparated({
			element: selectedElement.element,
		});
	const sourceAudioLabel =
		selectedElement?.element.type === "video"
			? isSelectedSourceAudioSeparated
				? oc.timelineToolbar.recoverAudio
				: oc.timelineToolbar.separateAudio
			: oc.timelineToolbar.extractAudio;

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
					tooltip={oc.timelineToolbar.splitElement}
					disabled={hasEditLockedSelection}
					onClick={({ event }) => handleAction({ action: "split", event })}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignLeftIcon} />}
					tooltip={oc.timelineToolbar.splitLeft}
					disabled={hasEditLockedSelection}
					onClick={({ event }) => handleAction({ action: "split-left", event })}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignRightIcon} />}
					tooltip={oc.timelineToolbar.splitRight}
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
					tooltip={oc.timelineToolbar.duplicateElement}
					disabled={hasEditLockedSelection}
					onClick={({ event }) =>
						handleAction({ action: "duplicate-selected", event })
					}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={SnowIcon} />}
					tooltip={oc.timelineToolbar.freezeFrameSoon}
					disabled={true}
					onClick={({ event: _event }) => {}}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					tooltip={oc.timelineToolbar.deleteElement}
					disabled={hasEditLockedSelection}
					onClick={({ event }) =>
						handleAction({ action: "delete-selected", event })
					}
				/>

				<div className="bg-border mx-1 h-6 w-px" />

				<ToolbarButton
					icon={<HugeiconsIcon icon={Bookmark02Icon} />}
					isActive={isCurrentlyBookmarked}
					tooltip={
						isCurrentlyBookmarked
							? oc.timelineToolbar.removeBookmark
							: oc.timelineToolbar.addBookmark
					}
					onClick={({ event }) =>
						handleAction({ action: "toggle-bookmark", event })
					}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={MagicWand05Icon} />}
					isActive={smoothingPauses}
					disabled={smoothingPauses}
					tooltip={oc.timelineToolbar.smoothSilence}
					onClick={() => void handleSmoothSilenceGaps()}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={HeadphonesIcon} />}
					isActive={addingSfx}
					disabled={addingSfx || autoAudioLines.length === 0}
					tooltip={oc.timelineToolbar.autoSfx}
					onClick={() => void handleAutoInsertSfx()}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={MusicNote03Icon} />}
					isActive={addingBgm}
					disabled={addingBgm || autoAudioLines.length === 0}
					tooltip={oc.timelineToolbar.autoBgm}
					onClick={() => void handleAutoInsertBgm()}
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
						tooltip={
							graphEditor.canOpen
								? oc.timelineToolbar.openGraphEditor
								: graphEditor.tooltip
						}
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
	const { oc } = useOpencutI18n();
	const currentScene = editor.scenes.getActiveScene();

	return (
		<div>
			<SplitButton className="border-foreground/10 border">
				<SplitButtonLeft>
					{currentScene?.name || oc.timelineToolbar.noScene}
				</SplitButtonLeft>
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
	const { oc } = useOpencutI18n();
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
					tooltip={oc.timelineToolbar.autoSnapping}
					onClick={() => toggleSnapping()}
				/>

				<ToolbarButton
					icon={<OcRippleIcon size={24} className="scale-110" />}
					isActive={rippleEditingEnabled}
					tooltip={oc.timelineToolbar.rippleEditing}
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
				"rounded-lg",
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
