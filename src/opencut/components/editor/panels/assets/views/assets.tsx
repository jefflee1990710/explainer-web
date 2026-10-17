"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelView } from "@/opencut/components/editor/panels/assets/views/base-panel";
import { MediaDragOverlay } from "@/opencut/components/editor/panels/assets/drag-overlay";
import { DraggableItem } from "@/opencut/components/editor/panels/assets/draggable-item";
import { Button } from "@/opencut/components/ui/button";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/opencut/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/opencut/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/opencut/components/ui/tooltip";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/opencut/timeline/creation";
import { mediaTimeFromSeconds, type MediaTime } from "@/opencut/wasm";
import { useEditor } from "@/opencut/editor/use-editor";
import { useFileUpload } from "@/opencut/media/use-file-upload";
import { invokeAction } from "@/opencut/actions";
import { processMediaAssets } from "@/opencut/media/processing";
import { showMediaUploadToast } from "@/opencut/media/upload-toast";
import {
	SelectableItem,
	SelectableSurface,
	useSelection,
	useSelectionScope,
} from "@/opencut/selection";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { placementForScroMedia } from "@/opencut/embed/scro-clip-duration";
import {
	type MediaSortKey,
	type MediaSortOrder,
	type MediaViewMode,
	useAssetsPanelStore,
} from "@/opencut/components/editor/panels/assets/assets-panel-store";
import { MASKABLE_ELEMENT_TYPES } from "@/opencut/timeline";
import type { MediaAsset } from "@/opencut/media/types";
import { cn } from "@/opencut/utils/ui";
import {
	CloudUploadIcon,
	GridViewIcon,
	LeftToRightListDashIcon,
	SortingOneNineIcon,
	Image02Icon,
	MusicNote03Icon,
	Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
	mergeScroMediaAssets,
	resolveScroClipNumber,
	scroAssetPreviewSrc,
	scroDisplayName,
	ScroMediaOverlays,
	selectScroMediaClip,
} from "@/opencut/embed/scro-video-assets";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import { AssetsClipMenu } from "@/opencut/components/editor/panels/assets/views/assets-clip-menu";
import { BookendVideoCard } from "@/opencut/components/editor/panels/assets/views/assets-bookend-card";
import { listFolderBookendVideosAction } from "@/presentation/actions/video-edit";
import type { FolderBookendVideo } from "@/service/video-edit/edit-state";
import { localizedVideoType } from "@/util/video-type-i18n";
import { addSceneFrameToTimeline, ensureFrameStill } from "@/opencut/embed/scro-frame-still";
import { LoadingMediaImage } from "@/opencut/components/loading-media-image";
import { useI18n } from "@/presentation/components/i18n-provider";

export function MediaView() {
	const editor = useEditor();
	const mediaFiles = useEditor((e) => e.media.getAssets());
	const activeProject = useEditor((e) => e.project.getActive());
	const scroVideos = useScroVideos();

	const {
		mediaViewMode,
		setMediaViewMode,
		highlightMediaId,
		clearHighlight,
		mediaSortBy,
		mediaSortOrder,
		setMediaSort,
	} = useAssetsPanelStore();

	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);

	const processFiles = async ({ files }: { files: File[] }) => {
		if (!files || files.length === 0) return;
		if (!activeProject) {
			toast.error("No active project");
			return;
		}

		setIsProcessing(true);
		setProgress(0);
		try {
			await showMediaUploadToast({
				filesCount: files.length,
				promise: async () => {
					const processedAssets = await processMediaAssets({
						files,
						onProgress: (progress: { progress: number }) =>
							setProgress(progress.progress),
					});
					for (const asset of processedAssets) {
						await editor.media.addMediaAsset({
							projectId: activeProject.metadata.id,
							asset,
						});
					}
					return {
						uploadedCount: processedAssets.length,
						assetNames: processedAssets.map((asset) => asset.name),
					};
				},
			});
		} catch (error) {
			console.error("Error processing files:", error);
		} finally {
			setIsProcessing(false);
			setProgress(0);
		}
	};

	const { isDragOver, dragProps, openFilePicker, fileInputProps } =
		useFileUpload({
			accept: "image/*,video/*,audio/*",
			multiple: true,
			onFilesSelected: (files) => processFiles({ files }),
		});

	const handleRemove = ({
		event,
		ids,
	}: {
		event: React.MouseEvent;
		ids: string[];
	}) => {
		event.stopPropagation();

		invokeAction("remove-media-assets", {
			projectId: activeProject.metadata.id,
			assetIds: ids,
		});
	};

	const handleSort = ({ key }: { key: MediaSortKey }) => {
		if (mediaSortBy === key) {
			setMediaSort({
				key,
				order: mediaSortOrder === "asc" ? "desc" : "asc",
			});
		} else {
			setMediaSort({ key, order: "asc" });
		}
	};

	const filteredMediaItems = useMemo(() => {
		const filtered = mediaFiles.filter((item) => !item.ephemeral);
		// One ScroVideo row per clipNumber, then user imports — no separate section.
		const merged = mergeScroMediaAssets({
			assets: filtered,
			clips: scroVideos?.clips,
		});
		const scroIds = new Set(
			merged
				.filter(
					(item) =>
						resolveScroClipNumber({ asset: item, clips: scroVideos?.clips }) !=
						null,
				)
				.map((item) => item.id),
		);
		const scroItems = merged.filter((item) => scroIds.has(item.id));
		const otherItems = merged.filter((item) => !scroIds.has(item.id));

		otherItems.sort((a, b) => {
			let valueA: string | number;
			let valueB: string | number;

			switch (mediaSortBy) {
				case "name":
					valueA = a.name.toLowerCase();
					valueB = b.name.toLowerCase();
					break;
				case "type":
					valueA = a.type;
					valueB = b.type;
					break;
				case "duration":
					valueA = a.duration || 0;
					valueB = b.duration || 0;
					break;
				case "size":
					valueA = a.file.size;
					valueB = b.file.size;
					break;
				default:
					return 0;
			}

			if (valueA < valueB) return mediaSortOrder === "asc" ? -1 : 1;
			if (valueA > valueB) return mediaSortOrder === "asc" ? 1 : -1;
			return 0;
		});

		return [...scroItems, ...otherItems];
	}, [mediaFiles, mediaSortBy, mediaSortOrder, scroVideos?.clips]);
	const orderedMediaIds = useMemo(() => {
		return filteredMediaItems.map((item) => item.id);
	}, [filteredMediaItems]);

	return (
		<>
			<input {...fileInputProps} />

			<PanelView
				title="Assets"
				actions={
					<MediaActions
						mediaViewMode={mediaViewMode}
						setMediaViewMode={setMediaViewMode}
						isProcessing={isProcessing}
						sortBy={mediaSortBy}
						sortOrder={mediaSortOrder}
						onSort={handleSort}
						onImport={openFilePicker}
					/>
				}
				className={cn(isDragOver && "bg-accent/30")}
				contentClassName="h-full"
				{...dragProps}
			>
				{isDragOver || filteredMediaItems.length === 0 ? (
					<MediaDragOverlay
						isVisible={true}
						isProcessing={isProcessing}
						progress={progress}
						onClick={openFilePicker}
					/>
				) : (
					<SelectableSurface
						ariaLabel="Assets"
						orderedIds={orderedMediaIds}
						revealId={highlightMediaId}
						onRevealComplete={clearHighlight}
					>
						<MediaScopeRegistrar />
						<MediaItemList
							items={filteredMediaItems}
							mode={mediaViewMode}
							onRemove={handleRemove}
						/>
					</SelectableSurface>
				)}
			</PanelView>
		</>
	);
}

function MediaScopeRegistrar() {
	useSelectionScope();
	return null;
}

function MediaAssetDraggable({
	item,
	preview,
	variant,
	isRounded,
}: {
	item: MediaAsset;
	preview: React.ReactNode;
	variant: "card" | "compact";
	isRounded?: boolean;
}) {
	const editor = useEditor();
	const { t } = useI18n();
	const scroVideos = useScroVideos();
	const label = scroDisplayName({ asset: item, clips: scroVideos?.clips });
	const clipNumber = resolveScroClipNumber({
		asset: item,
		clips: scroVideos?.clips,
	});
	const clip =
		clipNumber != null
			? scroVideos?.clips.find((row) => row.clipNumber === clipNumber)
			: undefined;
	// The card can show a new start still while the file is still the previous video.
	const startStillUrl =
		clip && clip.stage !== "video_ready" ? clip.posterUrl : undefined;
	const assetIsStartStill =
		Boolean(startStillUrl) &&
		item.type === "image" &&
		(item.url === startStillUrl ||
			item.scroPosterUrl === startStillUrl ||
			item.thumbnailUrl === startStillUrl);
	const startStillName = `${label} · ${t("production.frame.position.start")}`;
	const [startStillId, setStartStillId] = useState<string | null>(null);

	useEffect(() => {
		if (!startStillUrl || assetIsStartStill) {
			setStartStillId(null);
			return;
		}
		let cancelled = false;
		void ensureFrameStill({ editor, url: startStillUrl, name: startStillName }).then(
			(asset) => {
				if (!cancelled && asset) setStartStillId(asset.id);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [assetIsStartStill, editor, startStillName, startStillUrl]);

	const addElementAtTime = ({
		asset,
		startTime,
	}: {
		asset: MediaAsset;
		startTime: MediaTime;
	}) => {
		// A generated file is often longer than the storyboard clip. Place the storyboard slice.
		const placed = placementForScroMedia({ asset, clips: scroVideos?.clips });
		const duration = placed
			? mediaTimeFromSeconds({ seconds: placed.visibleSeconds })
			: asset.duration != null
				? mediaTimeFromSeconds({ seconds: asset.duration })
				: DEFAULT_NEW_ELEMENT_DURATION;
		const element = buildElementFromMedia({
			mediaId: asset.id,
			mediaType: asset.type,
			name: label,
			duration,
			startTime,
			scroClipNumber: placed?.clipNumber ?? asset.scroClipNumber,
			...(placed
				? {
						sourceDuration: mediaTimeFromSeconds({ seconds: placed.sourceSeconds }),
						trimEnd: mediaTimeFromSeconds({ seconds: placed.trimEndSeconds }),
					}
				: {}),
		});
		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	// Card frame matches the file, so a 9:16 still is not cropped into 16:9.
	const aspectRatio =
		item.width && item.height ? item.width / item.height : 16 / 9;

	return (
		<DraggableItem
			name={label}
			preview={preview}
			aspectRatio={aspectRatio}
			dragData={{
				id: startStillId ?? item.id,
				type: "media",
				mediaType: startStillId ? "image" : item.type,
				name: startStillId ? startStillName : label,
				...(item.type !== "audio" && {
					targetElementTypes: [...MASKABLE_ELEMENT_TYPES],
				}),
			}}
			shouldShowPlusOnDrag={false}
			onAddToTimeline={({ currentTime }) => {
				if (startStillUrl && !assetIsStartStill && clip) {
					void addSceneFrameToTimeline({
						editor,
						url: startStillUrl,
						name: startStillName,
						durationSeconds: clip.durationSeconds,
						startTime: currentTime,
					});
					return;
				}
				addElementAtTime({ asset: item, startTime: currentTime });
			}}
			variant={variant}
			isRounded={isRounded}
		/>
	);
}

function MediaItemWithContextMenu({
	item,
	children,
	onRemove,
}: {
	item: MediaAsset;
	children: React.ReactNode;
	onRemove: ({
		event,
		ids,
	}: {
		event: React.MouseEvent;
		ids: string[];
	}) => void;
}) {
	const { isSelected, selectedIds } = useSelection();
	const idsToDelete = isSelected(item.id) ? selectedIds : [item.id];
	const deleteLabel =
		idsToDelete.length > 1 ? `Delete ${idsToDelete.length} items` : "Delete";

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem>Export clips</ContextMenuItem>
				<ContextMenuItem
					variant="destructive"
					onClick={(event: React.MouseEvent<HTMLDivElement>) =>
						onRemove({ event, ids: idsToDelete })
					}
				>
					{deleteLabel}
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function MediaItemList({
	items,
	mode,
	onRemove,
}: {
	items: MediaAsset[];
	mode: MediaViewMode;
	onRemove: ({
		event,
		ids,
	}: {
		event: React.MouseEvent;
		ids: string[];
	}) => void;
}) {
	const { t } = useI18n();
	const editor = useEditor();
	const scroVideos = useScroVideos();
	const isGrid = mode === "grid";
	const [bookends, setBookends] = useState<FolderBookendVideo[]>([]);

	useEffect(() => {
		const videoId = scroVideos?.videoId;
		if (!videoId) return;
		let cancelled = false;
		void listFolderBookendVideosAction(videoId).then((result) => {
			if (!cancelled && result.ok) setBookends(result.videos);
		});
		return () => {
			cancelled = true;
		};
	}, [scroVideos?.videoId]);

	const bookendNames = new Set(
		bookends.map((video) => `${localizedVideoType(t, video.skillSlug)} · ${video.title}`),
	);
	const bookendUrls = new Set(bookends.map((video) => video.videoUrl));
	// The download is also a library file. The Opening / Ending card is the one shown.
	const shown = items.filter(
		(item) =>
			!bookendNames.has(item.name) &&
			!(item.scroPosterUrl && bookendUrls.has(item.scroPosterUrl)),
	);

	return (
		<div
			className={cn(isGrid ? "grid gap-4" : "flex flex-col gap-1.5")}
			style={
				isGrid ? { gridTemplateColumns: "repeat(auto-fill, 7rem)" } : undefined
			}
		>
			{shown.map((item) => {
				const clipNumber = resolveScroClipNumber({
					asset: item,
					clips: scroVideos?.clips,
				});
				return (
					<div key={item.id} className={cn(isGrid && "contents")}>
						<MediaItemWithContextMenu item={item} onRemove={onRemove}>
							<SelectableItem
								className={cn(!isGrid && "w-full")}
								id={item.id}
								onClick={() => {
									if (clipNumber == null) return;
									selectScroMediaClip({
										clipNumber,
										editor,
									});
								}}
							>
								<MediaAssetDraggable
									item={item}
									preview={
										<MediaPreview
											item={item}
											variant={isGrid ? "grid" : "compact"}
										/>
									}
									variant={isGrid ? "card" : "compact"}
									isRounded={isGrid ? false : undefined}
								/>
							</SelectableItem>
						</MediaItemWithContextMenu>
					</div>
				);
			})}
			{isGrid
				? bookends.map((video) => <BookendVideoCard key={video.id} video={video} />)
				: null}
		</div>
	);
}

function formatDuration({ duration }: { duration: number }) {
	const min = Math.floor(duration / 60);
	const sec = Math.floor(duration % 60);
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

function MediaDurationBadge({ duration }: { duration?: number }) {
	if (!duration) return null;

	return (
		<div className="absolute right-1 bottom-1 z-20 rounded bg-black/70 px-1 text-xs text-white">
			{formatDuration({ duration })}
		</div>
	);
}

function MediaDurationLabel({ duration }: { duration?: number }) {
	if (!duration) return null;

	return (
		<span className="text-xs opacity-70">{formatDuration({ duration })}</span>
	);
}

function MediaTypePlaceholder({
	icon,
	label,
	duration,
	variant,
}: {
	icon: IconSvgElement;
	label: string;
	duration?: number;
	variant: "muted" | "bordered";
}) {
	const iconClassName = cn("size-6", variant === "bordered" && "mb-1");

	return (
		<div
			className={cn(
				"text-muted-foreground flex size-full flex-col items-center justify-center rounded",
				variant === "muted" ? "bg-muted/30" : "border",
			)}
		>
			<HugeiconsIcon icon={icon} className={iconClassName} />
			<span className="text-xs">{label}</span>
			<MediaDurationLabel duration={duration} />
		</div>
	);
}

function MediaPreview({
	item,
	variant = "grid",
}: {
	item: MediaAsset;
	variant?: "grid" | "compact";
}) {
	const scroVideos = useScroVideos();
	const shouldShowDurationBadge = variant === "grid";
	const clipNumber = resolveScroClipNumber({
		asset: item,
		clips: scroVideos?.clips,
	});
	const label = scroDisplayName({ asset: item, clips: scroVideos?.clips });
	const clip =
		clipNumber != null
			? scroVideos?.clips.find((row) => row.clipNumber === clipNumber)
			: undefined;
	// File length when the browser has probed it; otherwise the storyboard length.
	const videoSeconds =
		item.type === "video"
			? item.duration && item.duration > 0
				? item.duration
				: clip?.durationSeconds
			: undefined;
	const showDuration =
		shouldShowDurationBadge && videoSeconds != null && videoSeconds > 0;
	const durationBadge = showDuration ? (
		<MediaDurationBadge duration={videoSeconds} />
	) : null;
	const scroOverlay =
		clipNumber != null ? (
			<ScroMediaOverlays clipNumber={clipNumber} reserveCorner={showDuration} />
		) : null;
	// After regenerate, show the new start still as soon as it exists.
	const previewSrc = scroAssetPreviewSrc({ asset: item, clip });
	const showStartStill =
		item.type === "image" ||
		(Boolean(clip?.posterUrl) && (clip?.stage !== "video_ready" || Boolean(clip?.staleVideo)));

	if (showStartStill) {
		return (
			<div className="relative flex size-full items-center justify-center bg-muted">
				{previewSrc ? (
					<LoadingMediaImage
						key={previewSrc}
						src={previewSrc}
						alt={label}
						className={
							item.type === "video" ? "rounded object-cover" : "object-cover"
						}
					/>
				) : null}
				{scroOverlay}
				{durationBadge}
			</div>
		);
	}

	if (item.type === "video") {
		const videoThumb = previewSrc ?? item.thumbnailUrl;
		if (videoThumb) {
			return (
				<div className="relative size-full">
					<LoadingMediaImage
						key={videoThumb}
						src={videoThumb}
						alt={label}
						className="rounded object-cover"
					/>
					{scroOverlay}
					{durationBadge}
				</div>
			);
		}

		return (
			<div className="relative size-full">
				<MediaTypePlaceholder
					icon={Video01Icon}
					label="Video"
					variant="muted"
				/>
				{scroOverlay}
				{durationBadge}
			</div>
		);
	}

	if (item.type === "audio") {
		return (
			<MediaTypePlaceholder
				icon={MusicNote03Icon}
				label="Audio"
				duration={item.duration}
				variant="bordered"
			/>
		);
	}

	return (
		<MediaTypePlaceholder icon={Image02Icon} label="Unknown" variant="muted" />
	);
}

function MediaActions({
	mediaViewMode,
	setMediaViewMode,
	isProcessing,
	sortBy,
	sortOrder,
	onSort,
	onImport,
}: {
	mediaViewMode: MediaViewMode;
	setMediaViewMode: (mode: MediaViewMode) => void;
	isProcessing: boolean;
	sortBy: MediaSortKey;
	sortOrder: MediaSortOrder;
	onSort: ({ key }: { key: MediaSortKey }) => void;
	onImport: () => void;
}) {
	return (
		<div className="flex gap-1.5">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							variant="ghost"
							onClick={() =>
								setMediaViewMode(mediaViewMode === "grid" ? "list" : "grid")
							}
							disabled={isProcessing}
							className="items-center justify-center"
						>
							{mediaViewMode === "grid" ? (
								<HugeiconsIcon icon={LeftToRightListDashIcon} />
							) : (
								<HugeiconsIcon icon={GridViewIcon} />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>
							{mediaViewMode === "grid"
								? "Switch to list view"
								: "Switch to grid view"}
						</p>
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<DropdownMenu>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									disabled={isProcessing}
									className="items-center justify-center"
								>
									<HugeiconsIcon icon={SortingOneNineIcon} />
								</Button>
							</DropdownMenuTrigger>
						</TooltipTrigger>
						<DropdownMenuContent align="end">
							<SortMenuItem
								label="Name"
								sortKey="name"
								currentSortBy={sortBy}
								currentSortOrder={sortOrder}
								onSort={onSort}
							/>
							<SortMenuItem
								label="Type"
								sortKey="type"
								currentSortBy={sortBy}
								currentSortOrder={sortOrder}
								onSort={onSort}
							/>
							<SortMenuItem
								label="Duration"
								sortKey="duration"
								currentSortBy={sortBy}
								currentSortOrder={sortOrder}
								onSort={onSort}
							/>
							<SortMenuItem
								label="File size"
								sortKey="size"
								currentSortBy={sortBy}
								currentSortOrder={sortOrder}
								onSort={onSort}
							/>
						</DropdownMenuContent>
					</DropdownMenu>
					<TooltipContent>
						<p>
							Sort by {sortBy} (
							{sortOrder === "asc" ? "ascending" : "descending"})
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<Button
				variant="outline"
				onClick={onImport}
				disabled={isProcessing}
				size="sm"
				className="items-center justify-center gap-1.5"
			>
				<HugeiconsIcon icon={CloudUploadIcon} />
				Import
			</Button>
		</div>
	);
}

function SortMenuItem({
	label,
	sortKey,
	currentSortBy,
	currentSortOrder,
	onSort,
}: {
	label: string;
	sortKey: MediaSortKey;
	currentSortBy: MediaSortKey;
	currentSortOrder: MediaSortOrder;
	onSort: ({ key }: { key: MediaSortKey }) => void;
}) {
	const isActive = currentSortBy === sortKey;
	const arrow = isActive ? (currentSortOrder === "asc" ? "↑" : "↓") : "";

	return (
		<DropdownMenuItem onClick={() => onSort({ key: sortKey })}>
			{label} {arrow}
		</DropdownMenuItem>
	);
}
