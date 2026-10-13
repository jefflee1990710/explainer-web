"use client";

import { useState } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { requestScroSubtitlePlates } from "@/opencut/embed/scro-subtitle-generate";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { useScroSubtitleCatalog, useScroSubtitleVideoId } from "@/opencut/embed/scro-subtitle-store";
import { isScroSubtitleName, matchSubtitleSlots } from "@/opencut/embed/scro-subtitle-slots";
import { processMediaAssets } from "@/opencut/media/processing";
import { buildElementFromMedia } from "@/opencut/timeline/element-utils";
import { Button } from "@/opencut/components/ui/button";
import { cn } from "@/opencut/utils/ui";

function fill({
	template,
	values,
}: {
	template: string;
	values: Record<string, number>;
}) {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

// Text style list. Generate asks Scro to draw each spoken line, then drops PNGs on the timeline.
export function ScroSubtitlePanel() {
	const editor = useEditor();
	const catalog = useScroSubtitleCatalog();
	const videoId = useScroSubtitleVideoId();
	const [picked, setPicked] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const ui = catalog?.ui;
	const selected =
		picked && catalog?.styles.some((style) => style.id === picked) ? picked : catalog?.selectedId ?? "";

	const generate = async () => {
		if (!catalog || !ui || busy || !videoId) return;
		const style = catalog.styles.find((item) => item.id === selected);
		if (!style) return;
		if (catalog.lines.length === 0) {
			setMessage(ui.noLines);
			return;
		}
		const project = editor.project.getActiveOrNull();
		if (!project) return;
		const scene = editor.scenes.getActiveScene();
		const slots = matchSubtitleSlots({
			elements: scene.tracks.main.elements,
			clipNumbers: catalog.lines.map((line) => line.clipNumber),
		});
		const placedLines = catalog.lines.filter((line) => slots.has(line.clipNumber));
		if (placedLines.length === 0) {
			setMessage(ui.noMatch);
			return;
		}

		setBusy(true);
		setMessage(ui.generating);
		try {
			const stale = [scene.tracks.main, ...scene.tracks.overlay].flatMap((track) =>
				track.elements
					.filter((element) => isScroSubtitleName({ name: element.name }))
					.map((element) => ({ trackId: track.id, elementId: element.id })),
			);
			if (stale.length > 0) editor.timeline.deleteElements({ elements: stale });

			const plates = await requestScroSubtitlePlates({
				videoId,
				textStyleId: style.id,
				clipNumbers: placedLines.map((line) => line.clipNumber),
			});
			const urlByClip = new Map(plates.map((plate) => [plate.clipNumber, plate.url]));

			for (const line of placedLines) {
				const slot = slots.get(line.clipNumber);
				const url = urlByClip.get(line.clipNumber);
				if (!slot || !url) continue;
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Failed to fetch subtitle ${line.clipNumber}`);
				const blob = await response.blob();
				const file = new File([blob], `Subtitle ${line.clipNumber}.png`, { type: "image/png" });
				const processed = await processMediaAssets({ files: [file] });
				const asset = processed[0];
				if (!asset) continue;
				const created = await editor.media.addMediaAsset({
					projectId: project.metadata.id,
					asset,
				});
				if (!created) continue;
				editor.timeline.insertElement({
					placement: { mode: "auto" },
					element: buildElementFromMedia({
						mediaId: created.id,
						mediaType: "image",
						name: `Subtitle ${line.clipNumber}`,
						duration: slot.duration,
						startTime: slot.startTime,
					}),
				});
			}
			armScroSync();
			const placedCount = placedLines.filter((line) => urlByClip.has(line.clipNumber)).length;
			const missing = catalog.lines.length - placedLines.length;
			setMessage(
				missing > 0
					? fill({ template: ui.placedPartial, values: { count: placedCount, missing } })
					: fill({ template: ui.placed, values: { count: placedCount } }),
			);
		} catch (error) {
			console.error("Subtitle images failed:", error);
			setMessage(error instanceof Error ? error.message : ui.noMatch);
		} finally {
			setBusy(false);
		}
	};

	if (!catalog || !ui) {
		return <div className="text-muted-foreground p-4 text-sm">…</div>;
	}

	return (
		<div className="flex h-full flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto p-3">
				<h2 className="text-sm font-medium">{ui.subtitles}</h2>
				<p className="text-muted-foreground mt-1 text-xs leading-snug">{ui.hint}</p>
				<div className="mt-3 flex flex-col gap-1" role="listbox" aria-label={ui.subtitles}>
					{catalog.styles.map((style) => {
						const active = style.id === selected;
						return (
							<button
								key={style.id}
								type="button"
								role="option"
								aria-selected={active}
								onClick={() => setPicked(style.id)}
								className={cn(
									"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
									active ? "bg-secondary" : "hover:bg-muted",
								)}
							>
								<img
									src={style.previewUrl}
									alt=""
									className="bg-muted h-10 w-16 shrink-0 rounded object-cover"
								/>
								<span className="truncate text-sm">{style.name}</span>
							</button>
						);
					})}
				</div>
			</div>
			<div className="border-t p-3">
				<Button className="w-full" disabled={busy || catalog.lines.length === 0 || !videoId} onClick={() => void generate()}>
					{busy ? ui.generating : ui.generate}
				</Button>
				{message ? <p className="text-muted-foreground mt-2 text-xs">{message}</p> : null}
				{catalog.lines.length === 0 ? <p className="text-muted-foreground mt-2 text-xs">{ui.noLines}</p> : null}
			</div>
		</div>
	);
}
