"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { useScroSubtitleCatalog, useScroSubtitleVideoId } from "@/opencut/embed/scro-subtitle-store";
import { isScroSubtitleName, matchSubtitleSlots } from "@/opencut/embed/scro-subtitle-slots";
import { ScroSubtitleStyleGrid } from "@/opencut/components/editor/panels/assets/scro-subtitle-style-grid";
import { Button } from "@/opencut/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/opencut/components/ui/select";
import { loadFullFont } from "@/opencut/fonts/google-fonts";
import { TEXT_FONT_PRESETS } from "@/opencut/text/font-presets";
import {
	ARTISTIC_SUBTITLE_PRESETS,
	resolveSubtitleStyleOverrides,
	splitVoIntoSubtitleSegments,
} from "@/opencut/subtitles/artistic-presets";
import { buildSubtitleTextElement } from "@/opencut/subtitles/build-subtitle-text-element";
import { insertCaptionChunksAsTextTrack } from "@/opencut/subtitles/insert";
import type { SubtitleCue } from "@/opencut/subtitles/types";
import { mediaTimeToSeconds } from "@/opencut/wasm";

const STYLE_DEFAULT_FONT_VALUE = "__style_default__";

function fill({
	template,
	values,
}: {
	template: string;
	values: Record<string, number>;
}) {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

// Native font subtitle panel: builds editable TextElements directly from storyboard VO lines
// with bilingual Google Fonts and artistic stroke/shadow/pill presets.
export function ScroSubtitlePanel() {
	const editor = useEditor();
	const catalog = useScroSubtitleCatalog();
	const videoId = useScroSubtitleVideoId();
	const [pickedStyleId, setPickedStyleId] = useState<string | null>(null);
	const [fontOverride, setFontOverride] = useState<string>(STYLE_DEFAULT_FONT_VALUE);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	// Preload artistic preset fonts and curated bilingual fonts when the panel opens.
	useEffect(() => {
		for (const preset of Object.values(ARTISTIC_SUBTITLE_PRESETS)) {
			void loadFullFont({ family: preset.defaultFontFamily });
		}
		for (const font of TEXT_FONT_PRESETS.slice(0, 12)) {
			void loadFullFont({ family: font.family, weights: font.weights });
		}
	}, []);

	const ui = catalog?.ui;
	const selectedStyleId =
		pickedStyleId && catalog?.styles.some((style) => style.id === pickedStyleId)
			? pickedStyleId
			: catalog?.selectedId ?? "bold";

	const activeFontOverride =
		fontOverride === STYLE_DEFAULT_FONT_VALUE ? null : fontOverride;

	// When subtitles already exist on the timeline, clicking another style or font updates them live.
	const applyToExistingSubtitles = async ({
		nextStyleId,
		nextFontOverride,
	}: {
		nextStyleId: string;
		nextFontOverride: string | null;
	}) => {
		if (!catalog) return;
		const project = editor.project.getActiveOrNull();
		if (!project) return;
		const scene = editor.scenes.getActiveScene();
		const hasExisting = scene.tracks.overlay.some(
			(track) =>
				track.type === "text" &&
				track.elements.some((el) => isScroSubtitleName({ name: el.name })),
		);
		if (!hasExisting) return;

		const styleCard =
			catalog.styles.find((item) => item.id === nextStyleId) ??
			catalog.styles[0];
		if (!styleCard) return;
		const lookId = styleCard.drawLook || styleCard.id;
		const styleOverrides = resolveSubtitleStyleOverrides({
			lookId,
			fontFamilyOverride: nextFontOverride,
		});
		if (styleOverrides.fontFamily) {
			await loadFullFont({ family: styleOverrides.fontFamily });
		}

		const canvasSize = project.settings.canvasSize;
		let index = 0;
		const nextOverlay = scene.tracks.overlay.map((track) => {
			if (track.type !== "text") return track;
			return {
				...track,
				elements: track.elements.map((el) => {
					if (!isScroSubtitleName({ name: el.name })) return el;
					const rawText = String(el.params.content ?? "").replace(/\n+/g, " ").trim();
					const rebuilt = buildSubtitleTextElement({
						index: index++,
						caption: {
							name: el.name,
							text: rawText,
							startTime: mediaTimeToSeconds({ time: el.startTime }),
							duration: mediaTimeToSeconds({ time: el.duration }),
							style: styleOverrides,
						},
						canvasSize,
					});
					return {
						...el,
						params: {
							...el.params,
							...rebuilt.params,
						},
					};
				}),
			};
		});

		editor.timeline.updateTracks({
			...scene.tracks,
			overlay: nextOverlay,
		});
		armScroSync();
	};

	const generate = async () => {
		if (!catalog || !ui || busy || !videoId) return;
		const styleCard =
			catalog.styles.find((item) => item.id === selectedStyleId) ??
			catalog.styles[0];
		if (!styleCard) return;
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
			const lookId = styleCard.drawLook || styleCard.id;
			const styleOverrides = resolveSubtitleStyleOverrides({
				lookId,
				fontFamilyOverride: activeFontOverride,
			});
			if (styleOverrides.fontFamily) {
				await loadFullFont({ family: styleOverrides.fontFamily });
			}

			// Remove previous auto-generated Subtitle elements before inserting the updated track.
			const stale = [scene.tracks.main, ...scene.tracks.overlay].flatMap((track) =>
				track.elements
					.filter((element) => isScroSubtitleName({ name: element.name }))
					.map((element) => ({ trackId: track.id, elementId: element.id })),
			);
			if (stale.length > 0) {
				editor.timeline.deleteElements({ elements: stale });
			}

			const captions: SubtitleCue[] = [];
			for (const line of placedLines) {
				const slot = slots.get(line.clipNumber);
				if (!slot) continue;
				const startSeconds = mediaTimeToSeconds({ time: slot.startTime });
				const durationSeconds = mediaTimeToSeconds({ time: slot.duration });
				const segments = splitVoIntoSubtitleSegments({
					line: line.line,
					startTime: startSeconds,
					duration: durationSeconds,
				});
				segments.forEach((seg, segIndex) => {
					captions.push({
						name:
							segments.length > 1
								? `Subtitle ${line.clipNumber}-${segIndex + 1}`
								: `Subtitle ${line.clipNumber}`,
						text: seg.text,
						startTime: seg.startTime,
						duration: seg.duration,
						style: styleOverrides,
					});
				});
			}

			insertCaptionChunksAsTextTrack({
				editor,
				captions,
			});

			armScroSync();
			const placedCount = placedLines.length;
			const missing = catalog.lines.length - placedLines.length;
			setMessage(
				missing > 0
					? fill({ template: ui.placedPartial, values: { count: placedCount, missing } })
					: fill({ template: ui.placed, values: { count: placedCount } }),
			);
		} catch (error) {
			console.error("Subtitle generation failed:", error);
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
			<div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
				<div>
					<h2 className="text-sm font-medium">{ui.subtitles}</h2>
					<p className="text-muted-foreground mt-1 text-xs leading-snug">{ui.hint}</p>
				</div>

				<div className="space-y-1.5">
					<label className="text-xs font-medium">
						Font · 中英字體
					</label>
					<Select
						value={fontOverride}
						onValueChange={(value) => {
							setFontOverride(value);
							const nextOverride =
								value === STYLE_DEFAULT_FONT_VALUE ? null : value;
							void applyToExistingSubtitles({
								nextStyleId: selectedStyleId,
								nextFontOverride: nextOverride,
							});
						}}
					>
						<SelectTrigger className="w-full text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={STYLE_DEFAULT_FONT_VALUE}>
								跟隨藝術樣式預設字體 (Style Default)
							</SelectItem>
							{TEXT_FONT_PRESETS.map((preset) => (
								<SelectItem key={preset.id} value={preset.family}>
									{preset.label ?? preset.family}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<ScroSubtitleStyleGrid
					styles={catalog.styles}
					selectedId={selectedStyleId}
					fontFamilyOverride={activeFontOverride}
					label={ui.subtitles}
					onSelect={(id) => {
						setPickedStyleId(id);
						void applyToExistingSubtitles({
							nextStyleId: id,
							nextFontOverride: activeFontOverride,
						});
					}}
				/>
			</div>
			<div className="border-t p-3">
				<Button
					className="w-full"
					disabled={busy || catalog.lines.length === 0 || !videoId}
					onClick={() => void generate()}
				>
					{busy ? ui.generating : ui.generate}
				</Button>
				{message ? <p className="text-muted-foreground mt-2 text-xs">{message}</p> : null}
				{catalog.lines.length === 0 ? (
					<p className="text-muted-foreground mt-2 text-xs">{ui.noLines}</p>
				) : null}
			</div>
		</div>
	);
}
