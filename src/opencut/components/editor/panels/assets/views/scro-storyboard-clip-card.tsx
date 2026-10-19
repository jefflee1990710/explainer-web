"use client";

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
}: {
	clip: ScroVideoSeedClip;
	variant: "card" | "compact";
	aspectRatio: number;
	onSelect: () => void;
}) {
	const showDuration = variant === "card" && clip.durationSeconds > 0;

	return (
		<div
			role="button"
			tabIndex={0}
			className={variant === "card" ? "contents" : "w-full"}
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
				isRounded={variant === "card" ? false : undefined}
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
							<div className="absolute right-1 bottom-1 z-20 rounded bg-black/70 px-1 text-xs text-white">
								{formatDuration({ duration: clip.durationSeconds })}
							</div>
						) : null}
					</div>
				}
			/>
		</div>
	);
}
