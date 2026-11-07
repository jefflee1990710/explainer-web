"use client";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/opencut/components/ui/context-menu";
import { DraggableItem } from "@/opencut/components/editor/panels/assets/draggable-item";
import { LoadingMediaImage } from "@/opencut/components/loading-media-image";
import { ScroMediaOverlays } from "@/opencut/embed/scro-video-assets";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

function formatDuration({ duration }: { duration: number }) {
	const min = Math.floor(duration / 60);
	const sec = Math.floor(duration % 60);
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

/** Storyboard clip that is not in the media library yet. The timeline can already show its poster. */
export function ScroStoryboardClipCard({
	clip,
	variant,
	aspectRatio,
	onSelect,
	onDuplicate,
	duplicateDisabled = false,
	isSelected = false,
}: {
	clip: ScroVideoSeedClip;
	variant: "card" | "compact";
	aspectRatio: number;
	onSelect: () => void;
	onDuplicate?: () => void;
	duplicateDisabled?: boolean;
	isSelected?: boolean;
}) {
	const showDuration = variant === "card" && clip.durationSeconds > 0;
	const card = (
		<div
			role="button"
			tabIndex={0}
			aria-selected={isSelected}
			className={
				variant === "card"
					? `relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [[data-studio-theme=light]_&]:focus-visible:ring-[#12141c] ${
							isSelected
								? "ring-2 ring-white [[data-studio-theme=light]_&]:ring-[#12141c]"
								: ""
						}`
					: `w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [[data-studio-theme=light]_&]:focus-visible:ring-[#12141c] ${
							isSelected
								? "ring-2 ring-white [[data-studio-theme=light]_&]:ring-[#12141c]"
								: ""
						}`
			}
			onClick={onSelect}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onSelect();
				}
			}}
		>
			<DraggableItem
				name={clip.name}
				aspectRatio={aspectRatio}
				variant={variant}
				isDraggable={false}
				isRounded
				shouldShowPlusOnDrag={false}
				dragData={{
					id: `scro-clip-${clip.clipNumber}`,
					type: "media",
					mediaType: "image",
					name: clip.name,
				}}
				preview={
					<div className="relative flex size-full items-center justify-center bg-muted">
						{clip.posterUrl ? (
							<LoadingMediaImage
								src={clip.posterUrl}
								alt={clip.name}
								className="object-cover"
							/>
						) : null}
						<ScroMediaOverlays
							clipNumber={clip.clipNumber}
							reserveCorner={showDuration}
						/>
						{showDuration ? (
							<div className="absolute right-1.5 bottom-1.5 z-20 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-white">
								{formatDuration({ duration: clip.durationSeconds })}
							</div>
						) : null}
					</div>
				}
			/>
		</div>
	);

	if (!onDuplicate) return card;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem
					disabled={duplicateDisabled}
					onClick={(event: React.MouseEvent<HTMLDivElement>) => {
						event.stopPropagation();
						onDuplicate();
					}}
				>
					Duplicate
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
