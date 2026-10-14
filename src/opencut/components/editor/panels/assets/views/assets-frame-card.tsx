"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DraggableItem } from "@/opencut/components/editor/panels/assets/draggable-item";
import { useEditor } from "@/opencut/editor/use-editor";
import {
	addSceneFrameToTimeline,
	ensureFrameStill,
} from "@/opencut/embed/scro-frame-still";
import { MASKABLE_ELEMENT_TYPES } from "@/opencut/timeline";
import { useI18n } from "@/presentation/components/i18n-provider";

/** Start or end still the user can drop onto the timeline. */
export function SceneFrameCard({
	clipNumber,
	position,
	url,
	durationSeconds,
}: {
	clipNumber: number;
	position: "start" | "end";
	url: string;
	durationSeconds: number;
}) {
	const { t } = useI18n();
	const editor = useEditor();
	const canvas = useEditor((state) => state.project.getActiveOrNull()?.settings.canvasSize);
	const positionLabel = t(
		position === "start"
			? "production.frame.position.start"
			: "production.frame.position.end",
	);
	const name = `Clip ${clipNumber} · ${positionLabel}`;
	const [assetId, setAssetId] = useState<string | null>(null);
	const aspectRatio =
		canvas && canvas.width > 1 && canvas.height > 1
			? canvas.width / canvas.height
			: 9 / 16;

	useEffect(() => {
		let cancelled = false;
		void ensureFrameStill({ editor, url, name }).then((asset) => {
			if (!cancelled && asset) setAssetId(asset.id);
		});
		return () => {
			cancelled = true;
		};
	}, [editor, url, name]);

	return (
		<DraggableItem
			name={name}
			aspectRatio={aspectRatio}
			isDraggable={assetId != null}
			dragData={{
				id: assetId ?? url,
				type: "media",
				mediaType: "image",
				name,
				targetElementTypes: [...MASKABLE_ELEMENT_TYPES],
			}}
			onAddToTimeline={({ currentTime }) => {
				void addSceneFrameToTimeline({
					editor,
					url,
					name,
					durationSeconds,
					startTime: currentTime,
				});
			}}
			variant="card"
			isRounded={false}
			preview={
				<div className="relative size-full bg-muted">
					<Image
						src={url}
						alt={name}
						fill
						sizes="100vw"
						className="object-cover"
						loading="lazy"
						unoptimized
					/>
				</div>
			}
		/>
	);
}
