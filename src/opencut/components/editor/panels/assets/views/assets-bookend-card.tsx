"use client";

import { useEffect, useState } from "react";
import { DraggableItem } from "@/opencut/components/editor/panels/assets/draggable-item";
import { useEditor } from "@/opencut/editor/use-editor";
import { addBookendVideoToTimeline, ensureBookendVideo } from "@/opencut/embed/scro-bookend-video";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import { LoadingMediaImage } from "@/opencut/components/loading-media-image";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { FolderBookendVideo } from "@/service/video-edit/edit-state";
import { localizedVideoType } from "@/util/video-type-i18n";

/** Opening or Ending video the user can drop onto this project's timeline. */
export function BookendVideoCard({ video }: { video: FolderBookendVideo }) {
	const { t } = useI18n();
	const editor = useEditor();
	const scroVideos = useScroVideos();
	const canvas = useEditor((state) => state.project.getActiveOrNull()?.settings.canvasSize);
	const typeLabel = localizedVideoType(t, video.skillSlug);
	const name = `${typeLabel} · ${video.title}`;
	const [assetId, setAssetId] = useState<string | null>(null);
	const aspectRatio =
		canvas && canvas.width > 1 && canvas.height > 1 ? canvas.width / canvas.height : 9 / 16;
	const editorVideoId = scroVideos?.videoId ?? "";

	useEffect(() => {
		if (!editorVideoId) return;
		let cancelled = false;
		void ensureBookendVideo({
			editor,
			editorVideoId,
			url: video.videoUrl,
			name,
			posterUrl: video.posterUrl,
		}).then((asset) => {
			if (!cancelled && asset) setAssetId(asset.id);
		});
		return () => {
			cancelled = true;
		};
	}, [editor, editorVideoId, name, video.posterUrl, video.videoUrl]);

	const minutes = Math.floor(video.durationSeconds / 60);
	const seconds = Math.floor(video.durationSeconds % 60);
	const durationLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

	return (
		<DraggableItem
			name={name}
			aspectRatio={aspectRatio}
			isDraggable
			dragData={{
				id: assetId ?? video.id,
				type: "media",
				mediaType: "video",
				name,
				placeOnMainTrack: true,
				bookend: {
					url: video.videoUrl,
					posterUrl: video.posterUrl,
					editorVideoId,
				},
			}}
			onAddToTimeline={({ currentTime }) => {
				if (!editorVideoId) return;
				void addBookendVideoToTimeline({
					editor,
					editorVideoId,
					url: video.videoUrl,
					name,
					posterUrl: video.posterUrl,
					startTime: currentTime,
				});
			}}
			variant="card"
			isRounded={false}
			preview={
				<div className="relative size-full bg-muted">
					{video.posterUrl ? (
						<LoadingMediaImage src={video.posterUrl} alt={name} className="object-cover" />
					) : null}
					<span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-xs text-white">
						{durationLabel}
					</span>
				</div>
			}
		/>
	);
}
