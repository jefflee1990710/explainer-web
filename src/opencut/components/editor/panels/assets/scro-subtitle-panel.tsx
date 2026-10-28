"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { useScroSubtitleCatalog, useScroSubtitleVideoId } from "@/opencut/embed/scro-subtitle-store";
import { isScroSubtitleName, matchSubtitleSlots } from "@/opencut/embed/scro-subtitle-slots";
import { SubtitleTrackStyleControls } from "@/opencut/components/editor/panels/assets/subtitle-track-style-controls";
import { ScroSubtitleDesignDialog } from "@/opencut/components/editor/panels/assets/scro-subtitle-design-dialog";
import { Button } from "@/opencut/components/ui/button";
import { Input } from "@/opencut/components/ui/input";
import { loadFullFont } from "@/opencut/fonts/google-fonts";
import { SYSTEM_FONTS } from "@/opencut/fonts/system-fonts";
import { TEXT_FONT_PRESETS } from "@/opencut/text/font-presets";
import { quoteFontFamily } from "@/opencut/text/primitives";
import {
	ARTISTIC_SUBTITLE_PRESETS,
	resolveSubtitleStyleOverrides,
	splitVoIntoSubtitleSegments,
} from "@/opencut/subtitles/artistic-presets";
import { buildSubtitleTextElement } from "@/opencut/subtitles/build-subtitle-text-element";
import { insertCaptionChunksAsTextTrack } from "@/opencut/subtitles/insert";
import type { SubtitleCue } from "@/opencut/subtitles/types";
import { mediaTimeToSeconds } from "@/opencut/wasm";
import { cn } from "@/opencut/utils/ui";

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

// Native font subtitle panel: Step 1 shows a searchable font list with live preview;
// clicking the bottom Generate button opens a dialog to pick the artistic subtitle design (e.g. Torn Paper style).
export function ScroSubtitlePanel() {
	const editor = useEditor();
	const catalog = useScroSubtitleCatalog();
	const videoId = useScroSubtitleVideoId();
	const [pickedStyleId, setPickedStyleId] = useState<string | null>(null);
	const [fontOverride, setFontOverride] = useState<string>(STYLE_DEFAULT_FONT_VALUE);
	const [fontSearch, setFontSearch] = useState<string>("");
	const [designDialogOpen, setDesignDialogOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	// Preload artistic preset fonts and curated bilingual fonts when the panel opens.
	useEffect(() => {
		for (const preset of Object.values(ARTISTIC_SUBTITLE_PRESETS)) {
			void loadFullFont({ family: preset.defaultFontFamily });
		}
		for (const font of TEXT_FONT_PRESETS) {
			if (SYSTEM_FONTS.has(font.family)) continue;
			void loadFullFont({ family: font.family, weights: font.weights });
		}
	}, []);

	const ui = catalog?.ui;
	const selectedStyleId =
		pickedStyleId && catalog?.styles.some((style) => style.id === pickedStyleId)
			? pickedStyleId
			: catalog?.selectedId ?? "clean";

	const activeFontOverride =
		fontOverride === STYLE_DEFAULT_FONT_VALUE ? null : fontOverride;

	const selectedFontLabel = useMemo(() => {
		if (!activeFontOverride) {
			return "跟隨設計預設字體 (Style Default)";
		}
		const found = TEXT_FONT_PRESETS.find((item) => item.family === activeFontOverride);
		return found?.label ?? activeFontOverride;
	}, [activeFontOverride]);

	const filteredFonts = useMemo(() => {
		const q = fontSearch.trim().toLowerCase();
		if (!q) return TEXT_FONT_PRESETS;
		return TEXT_FONT_PRESETS.filter(
			(preset) =>
				(preset.label ?? "").toLowerCase().includes(q) ||
				preset.family.toLowerCase().includes(q) ||
				preset.sample.toLowerCase().includes(q) ||
				preset.id.toLowerCase().includes(q),
		);
	}, [fontSearch]);

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
							...(typeof el.params["transform.positionY"] === "number"
								? { "transform.positionY": el.params["transform.positionY"] }
								: {}),
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

	const generate = async (styleIdToUse = selectedStyleId) => {
		if (!catalog || !ui || busy || !videoId) return;
		const styleCard =
			catalog.styles.find((item) => item.id === styleIdToUse) ??
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
			setDesignDialogOpen(false);
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

	const currentStyleCard =
		catalog.styles.find((item) => item.id === selectedStyleId) ??
		catalog.styles[0];

	return (
		<div className="flex h-full flex-col">
			<div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
				<div>
					<h2 className="text-sm font-medium">{ui.subtitles}</h2>
					<p className="text-muted-foreground mt-1 text-xs leading-snug">
						先揀選或搜尋喜歡嘅中英字體，再撳下方按鈕選擇字幕設計（如撕紙雙色字卡）並生成。
					</p>
				</div>

				{/* Search bar for fonts */}
				<div className="space-y-2">
					<Input
						size="xs"
						value={fontSearch}
						onChange={(e) => setFontSearch(e.currentTarget.value)}
						placeholder="搜尋字體 · Search font (e.g. Oswald, 思源, 手寫)..."
						showClearIcon
						onClear={() => setFontSearch("")}
					/>

					{/* Font list with live preview cards */}
					<div className="space-y-1.5" role="listbox" aria-label="Font list">
						{!fontSearch.trim() ? (
							<button
								type="button"
								role="option"
								aria-selected={fontOverride === STYLE_DEFAULT_FONT_VALUE}
								onClick={() => {
									setFontOverride(STYLE_DEFAULT_FONT_VALUE);
									void applyToExistingSubtitles({
										nextStyleId: selectedStyleId,
										nextFontOverride: null,
									});
								}}
								className={cn(
									"flex w-full cursor-pointer items-center justify-between rounded-md border px-2.5 py-2 text-left transition",
									fontOverride === STYLE_DEFAULT_FONT_VALUE
										? "border-foreground bg-secondary shadow-xs"
										: "border-border/60 hover:bg-muted/60",
								)}
							>
								<div className="min-w-0">
									<div className="truncate text-xs font-semibold">
										跟隨設計預設字體 · Style Default
									</div>
									<div className="text-muted-foreground truncate text-[11px]">
										自動匹配所選字幕設計嘅最佳中英字體
									</div>
								</div>
								<span className="bg-primary/15 text-primary ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold">
									推薦
								</span>
							</button>
						) : null}

						<div className="grid grid-cols-1 gap-1.5">
							{filteredFonts.map((preset) => {
								const isSelected = fontOverride === preset.family;
								return (
									<button
										key={preset.id}
										type="button"
										role="option"
										aria-selected={isSelected}
										onClick={() => {
											setFontOverride(preset.family);
											void loadFullFont({
												family: preset.family,
												weights: preset.weights,
											}).finally(() => {
												void applyToExistingSubtitles({
													nextStyleId: selectedStyleId,
													nextFontOverride: preset.family,
												});
											});
										}}
										className={cn(
											"flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition",
											isSelected
												? "border-foreground bg-secondary shadow-xs"
												: "border-border/60 hover:bg-muted/60",
										)}
									>
										<div className="min-w-0 flex-1">
											<div className="text-muted-foreground truncate text-[11px] font-medium">
												{preset.label ?? preset.family}
											</div>
											<div
												className="mt-0.5 truncate text-sm leading-snug select-none"
												style={{
													fontFamily: `${quoteFontFamily({ fontFamily: preset.family })}, sans-serif`,
													fontWeight: preset.fontWeight === "bold" ? 700 : 500,
												}}
											>
												{preset.sample}
											</div>
										</div>
										{isSelected ? (
											<span className="bg-foreground text-background shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
												已選
											</span>
										) : null}
									</button>
								);
							})}
							{filteredFonts.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-xs">
									找不到符合「{fontSearch}」嘅字體
								</p>
							) : null}
						</div>
					</div>
				</div>

				{/* Existing Subtitle Track batch controls (position Y + dual colors) when track exists */}
				<SubtitleTrackStyleControls compact />
			</div>

			<div className="border-t p-3">
				{currentStyleCard ? (
					<div className="mb-2 flex items-center justify-between text-[11px]">
						<span className="text-muted-foreground">目前設計：</span>
						<button
							type="button"
							onClick={() => setDesignDialogOpen(true)}
							className="text-primary cursor-pointer font-medium hover:underline"
						>
							{currentStyleCard.name} (點擊更換)
						</button>
					</div>
				) : null}
				<Button
					className="w-full"
					disabled={busy || catalog.lines.length === 0 || !videoId}
					onClick={() => setDesignDialogOpen(true)}
				>
					{busy ? ui.generating : `${ui.generate} · 選擇字幕設計`}
				</Button>
				{message ? <p className="text-muted-foreground mt-2 text-xs">{message}</p> : null}
				{catalog.lines.length === 0 ? (
					<p className="text-muted-foreground mt-2 text-xs">{ui.noLines}</p>
				) : null}
			</div>

			<ScroSubtitleDesignDialog
				open={designDialogOpen}
				onOpenChange={setDesignDialogOpen}
				styles={catalog.styles}
				selectedId={selectedStyleId}
				fontFamilyOverride={activeFontOverride}
				fontLabel={selectedFontLabel}
				busy={busy}
				generateLabel={ui.generate}
				generatingLabel={ui.generating}
				onSelectStyle={(id) => {
					setPickedStyleId(id);
					void applyToExistingSubtitles({
						nextStyleId: id,
						nextFontOverride: activeFontOverride,
					});
				}}
				onConfirmGenerate={() => void generate(selectedStyleId)}
			/>
		</div>
	);
}
