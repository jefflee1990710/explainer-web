"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { isScroSubtitleName } from "@/opencut/embed/scro-subtitle-slots";
import { useScroSubtitleCatalog } from "@/opencut/embed/scro-subtitle-store";
import { isSubtitleTrack } from "@/opencut/subtitles/insert";
import {
	EXTRA_SUBTITLE_STYLE_CARDS,
	resolveSubtitleStyleOverrides,
} from "@/opencut/subtitles/artistic-presets";
import { buildSubtitleTextElement } from "@/opencut/subtitles/build-subtitle-text-element";
import { ScroSubtitleDesignDialog } from "@/opencut/components/editor/panels/assets/scro-subtitle-design-dialog";
import { SectionField } from "@/opencut/components/section";
import { ColorPicker } from "@/opencut/components/ui/color-picker";
import { Button } from "@/opencut/components/ui/button";
import { Slider } from "@/opencut/components/ui/slider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/opencut/components/ui/select";
import { loadFullFont } from "@/opencut/fonts/google-fonts";
import { TEXT_FONT_PRESETS } from "@/opencut/text/font-presets";
import { quoteFontFamily } from "@/opencut/text/primitives";
import { mediaTimeToSeconds } from "@/opencut/wasm";
import type { TextElement, TextTrack } from "@/opencut/timeline";
import type { TextBackgroundStyle } from "@/opencut/text/background";
import {
	localizeBilingualLabel,
	useOpencutI18n,
} from "@/opencut/i18n/use-opencut-i18n";
import { cn } from "@/opencut/utils/ui";

type StripOptionId = TextBackgroundStyle | "none";

const STRIP_STYLE_OPTIONS: Array<{
	value: StripOptionId;
	label: string;
	sampleTop: string;
	sampleBottom: string;
}> = [
	{
		value: "torn",
		label: "撕紙毛邊 · Torn",
		sampleTop: "Torn Paper",
		sampleBottom: "撕紙雙色",
	},
	{
		value: "brush",
		label: "筆刷重點 · Brush",
		sampleTop: "Marker Brush",
		sampleBottom: "筆刷重點",
	},
	{
		value: "rounded",
		label: "圓角膠囊 · Pill",
		sampleTop: "Modern Pill",
		sampleBottom: "圓角膠囊",
	},
	{
		value: "brutalist",
		label: "硬邊立體 · Box",
		sampleTop: "Brutalist",
		sampleBottom: "硬邊立體框",
	},
	{
		value: "skew",
		label: "美漫斜切 · Skew",
		sampleTop: "Comic Skew",
		sampleBottom: "美漫斜切帶",
	},
	{
		value: "neon",
		label: "賽博霓虹 · Neon",
		sampleTop: "Cyber Neon",
		sampleBottom: "賽博霓虹框",
	},
	{
		value: "gold",
		label: "黑金電影 · Gold",
		sampleTop: "Cinema Gold",
		sampleBottom: "黑金電影條",
	},
	{
		value: "none",
		label: "無底條 · No Strip",
		sampleTop: "Pure Text",
		sampleBottom: "純文字無底條",
	},
];

const DUO_COLOR_THEMES = [
	{
		id: "black-green",
		label: "黑＋綠",
		bg1: "#151515",
		text1: "#FFFFFF",
		bg2: "#64E338",
		text2: "#141414",
	},
	{
		id: "black-yellow",
		label: "黑＋黃",
		bg1: "#111318",
		text1: "#FFFFFF",
		bg2: "#FFE600",
		text2: "#111111",
	},
	{
		id: "white-blue",
		label: "白＋藍",
		bg1: "#FFFDF7",
		text1: "#12141C",
		bg2: "#3B82F6",
		text2: "#FFFFFF",
	},
	{
		id: "white-orange",
		label: "白＋橙",
		bg1: "#FFFDF7",
		text1: "#111111",
		bg2: "#FF5722",
		text2: "#FFFFFF",
	},
	{
		id: "yellow-red",
		label: "黃＋紅",
		bg1: "#FFEB3B",
		text1: "#111111",
		bg2: "#FF2E4C",
		text2: "#FFFFFF",
	},
	{
		id: "cyber-neon",
		label: "青＋粉",
		bg1: "#090D18",
		text1: "#00F5FF",
		bg2: "#160A24",
		text2: "#FF2E93",
	},
] as const;

function buildStripBadgePreviewStyle({
	shape,
	bgColor,
	textColor,
	fontFamily,
}: {
	shape: StripOptionId;
	bgColor: string;
	textColor: string;
	fontFamily: string;
}): CSSProperties {
	const base: CSSProperties = {
		fontFamily: `${quoteFontFamily({ fontFamily })}, sans-serif`,
		fontWeight: 800,
		color: textColor,
	};

	if (shape === "none") {
		return {
			...base,
			textShadow:
				"-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
		};
	}

	if (shape === "torn") {
		return {
			...base,
			backgroundColor: bgColor,
			padding: "1px 7px",
			borderRadius: "2px",
			boxShadow: "0 1px 2px rgba(0,0,0,0.35), -1px 0 0 rgba(255,255,255,0.35)",
			clipPath:
				"polygon(1% 4%, 98% 0%, 100% 48%, 99% 96%, 2% 100%, 0% 52%)",
		};
	}

	if (shape === "brush") {
		return {
			...base,
			backgroundColor: bgColor,
			padding: "1px 8px",
			borderRadius: "3px 9px 2px 8px",
			boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
		};
	}

	if (shape === "rounded") {
		return {
			...base,
			backgroundColor: bgColor,
			padding: "1px 8px",
			borderRadius: "9999px",
			boxShadow: "0 1px 3px rgba(0,0,0,0.28)",
		};
	}

	if (shape === "brutalist") {
		return {
			...base,
			backgroundColor: bgColor,
			padding: "1px 7px",
			border: "1.5px solid #111111",
			boxShadow: "2px 2px 0 #111111",
		};
	}

	if (shape === "skew") {
		return {
			...base,
			backgroundColor: bgColor,
			padding: "1px 7px",
			border: "1.5px solid #111111",
			boxShadow: "2px 2px 0 #000000",
			transform: "skewX(-10deg)",
		};
	}

	if (shape === "neon") {
		return {
			...base,
			backgroundColor: "rgba(9, 13, 24, 0.9)",
			padding: "1px 7px",
			borderRadius: "4px",
			border: `1px solid ${textColor}`,
			boxShadow: `0 0 6px ${textColor}`,
		};
	}

	return {
		...base,
		backgroundColor: bgColor,
		padding: "1px 7px",
		borderRadius: "3px",
		border: "1px solid rgba(255, 213, 79, 0.65)",
	};
}

export function findSubtitleTrack(
	overlayTracks: Array<{ id: string; name: string; type: string; elements: unknown[] }>,
): TextTrack | null {
	for (const track of overlayTracks) {
		if (track.type !== "text") continue;
		const textTrack = track as TextTrack;
		if (isSubtitleTrack({ name: textTrack.name, elements: textTrack.elements })) {
			return textTrack;
		}
	}
	return null;
}

// Native OpenCut Inspector layout (`divide-border flex flex-col divide-y` + `px-3.5 py-3` + `SectionField`)
// for batch-editing the entire Subtitle Track at once.
export function SubtitleTrackStyleControls({
	trackId,
	compact = false,
}: {
	trackId?: string;
	compact?: boolean;
}) {
	const editor = useEditor();
	const scene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const project = useEditor((e) => e.project.getActiveOrNull());
	const catalog = useScroSubtitleCatalog();
	const [designDialogOpen, setDesignDialogOpen] = useState(false);
	const [pickedStyleId, setPickedStyleId] = useState<string | null>(null);
	const [applyingDesign, setApplyingDesign] = useState(false);

	const allStyles = useMemo(() => {
		const base = catalog?.styles ?? [];
		const seen = new Set(base.map((s) => s.id));
		const merged = [...base];
		for (const extra of EXTRA_SUBTITLE_STYLE_CARDS) {
			if (!seen.has(extra.id)) {
				seen.add(extra.id);
				merged.push(extra);
			}
		}
		return merged;
	}, [catalog?.styles]);

	if (!scene || !project) return null;

	const subtitleTrack = trackId
		? (scene.tracks.overlay.find(
				(t): t is TextTrack => t.id === trackId && t.type === "text",
			) ?? null)
		: findSubtitleTrack(scene.tracks.overlay);

	if (!subtitleTrack || subtitleTrack.elements.length === 0) {
		return null;
	}

	const subtitleElements = subtitleTrack.elements.filter((el) =>
		isScroSubtitleName({ name: el.name }),
	);
	const targetElements: TextElement[] =
		subtitleElements.length > 0 ? subtitleElements : subtitleTrack.elements;
	const sample = targetElements[0];
	if (!sample) return null;

	const canvasHeight = project.settings.canvasSize.height || 1080;
	const halfHeight = Math.round(canvasHeight / 2);

	const posY =
		typeof sample.params["transform.positionY"] === "number"
			? sample.params["transform.positionY"]
			: 0;
	const fontSize =
		typeof sample.params.fontSize === "number" ? sample.params.fontSize : 3.2;
	const fontFamily =
		typeof sample.params.fontFamily === "string" && sample.params.fontFamily
			? sample.params.fontFamily
			: "Oswald, Montserrat, Noto Sans TC";
	const bgEnabled = Boolean(sample.params["background.enabled"]);
	const bgStyle: TextBackgroundStyle =
		(sample.params["background.style"] as TextBackgroundStyle | undefined) ??
		"torn";
	const activeStripOption: StripOptionId = bgEnabled ? bgStyle : "none";

	const line1Bg =
		typeof sample.params["background.color"] === "string"
			? sample.params["background.color"]
			: "#151515";
	const line2Bg =
		typeof sample.params["background.secondaryColor"] === "string"
			? sample.params["background.secondaryColor"]
			: "#64E338";
	const line1Text =
		typeof sample.params.color === "string" ? sample.params.color : "#FFFFFF";
	const line2Text =
		typeof sample.params["background.secondaryTextColor"] === "string"
			? sample.params["background.secondaryTextColor"]
			: "#141414";

	const applyPatchToAllSubtitles = (patchParams: Record<string, string | number | boolean>) => {
		const nextOverlay = scene.tracks.overlay.map((track) => {
			if (track.id !== subtitleTrack.id || track.type !== "text") return track;
			return {
				...track,
				elements: track.elements.map((el) => {
					if (
						subtitleElements.length > 0 &&
						!isScroSubtitleName({ name: el.name })
					) {
						return el;
					}
					return {
						...el,
						params: {
							...el.params,
							...patchParams,
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

	const selectAllOnTrack = () => {
		editor.selection.setSelectedElements({
			elements: targetElements.map((el) => ({
				trackId: subtitleTrack.id,
				elementId: el.id,
			})),
		});
	};

	const selectedStyleId =
		pickedStyleId && allStyles.some((style) => style.id === pickedStyleId)
			? pickedStyleId
			: catalog?.selectedId ?? allStyles[0]?.id ?? "clean";

	const currentStyleCard =
		allStyles.find((item) => item.id === selectedStyleId) ?? allStyles[0] ?? null;

	const applyDesignPresetToTrack = async (nextStyleId: string) => {
		const styleCard =
			allStyles.find((item) => item.id === nextStyleId) ?? allStyles[0];
		if (!styleCard) return;
		setApplyingDesign(true);
		try {
			const lookId = styleCard.drawLook || styleCard.id;
			const styleOverrides = resolveSubtitleStyleOverrides({
				lookId,
				fontFamilyOverride: null,
			});
			if (styleOverrides.fontFamily) {
				await loadFullFont({ family: styleOverrides.fontFamily });
			}
			const canvasSize = project.settings.canvasSize;
			let index = 0;
			const nextOverlay = scene.tracks.overlay.map((track) => {
				if (track.id !== subtitleTrack.id || track.type !== "text") return track;
				return {
					...track,
					elements: track.elements.map((el) => {
						if (
							subtitleElements.length > 0 &&
							!isScroSubtitleName({ name: el.name })
						) {
							return el;
						}
						const rawText = String(el.params.content ?? "")
							.replace(/\n+/g, " ")
							.trim();
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
		} finally {
			setApplyingDesign(false);
		}
	};

	const inFontPresets = TEXT_FONT_PRESETS.some((item) => item.family === fontFamily);
	const currentFontPreset = TEXT_FONT_PRESETS.find((item) => item.family === fontFamily);
	const { locale, oc } = useOpencutI18n();
	const fontLabel = localizeBilingualLabel(currentFontPreset?.label ?? fontFamily, locale);

	return (
		<div className="divide-border flex flex-col divide-y">
			{/* Section 1: Track Summary & Typography (Font Type + Font Size) */}
			<div className="space-y-3 px-3.5 py-3">
				<div className="flex items-center justify-between gap-2">
					<div>
						<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
							{oc.subtitleTrack.headerTitle(targetElements.length)}
						</p>
						<p className="text-muted-foreground mt-0.5 text-[11px]">
							{oc.subtitleTrack.headerSubtitle}
						</p>
					</div>
					{compact ? (
						<Button
							type="button"
							variant="secondary"
							size="sm"
							className="h-6 px-2.5 text-[11px]"
							onClick={selectAllOnTrack}
						>
							{oc.subtitleTrack.selectAll}
						</Button>
					) : null}
				</div>

				<SectionField label={oc.subtitleTrack.visualDesign}>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="flex h-8 w-full items-center justify-between px-3 text-xs font-medium"
						onClick={() => setDesignDialogOpen(true)}
					>
						<span className="truncate">
							{currentStyleCard
								? localizeBilingualLabel(currentStyleCard.name, locale)
								: oc.subtitleTrack.chooseStyle}
						</span>
						<span className="text-muted-foreground ml-2 shrink-0 text-[11px]">
							{oc.subtitleTrack.stylesCount(allStyles.length)}
						</span>
					</Button>
				</SectionField>

				<SectionField label={oc.subtitleTrack.fontFamily}>
					<Select
						value={fontFamily}
						onValueChange={(selected) => {
							const preset = TEXT_FONT_PRESETS.find(
								(item) => item.family === selected,
							);
							void loadFullFont({
								family: selected,
								weights: preset?.weights,
							}).finally(() => {
								applyPatchToAllSubtitles({ fontFamily: selected });
							});
						}}
					>
						<SelectTrigger className="w-full text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{!inFontPresets && fontFamily ? (
								<SelectItem value={fontFamily}>{fontFamily}</SelectItem>
							) : null}
							{TEXT_FONT_PRESETS.map((preset) => (
								<SelectItem key={preset.id} value={preset.family}>
									<span className="flex items-center gap-2">
										<span className="text-muted-foreground text-[11px]">
											{localizeBilingualLabel(preset.label ?? preset.family, locale)}
										</span>
										<span
											className="text-xs font-bold"
											style={{
												fontFamily: `${quoteFontFamily({ fontFamily: preset.family })}, sans-serif`,
											}}
										>
											{preset.sample}
										</span>
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SectionField>

				<SectionField
					label={oc.subtitleTrack.fontSize}
					beforeLabel={
						<span className="bg-muted text-foreground ml-auto rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums">
							{fontSize.toFixed(1)}
						</span>
					}
				>
					<Slider
						min={1.5}
						max={8.5}
						step={0.1}
						value={[fontSize]}
						onValueChange={(vals) => {
							const nextSize = vals[0];
							if (typeof nextSize === "number") {
								applyPatchToAllSubtitles({
									fontSize: Math.round(nextSize * 10) / 10,
								});
							}
						}}
					/>
				</SectionField>
			</div>

			{/* Section 2: Vertical Position Y */}
			<div className="space-y-3 px-3.5 py-3">
				<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
					{oc.subtitleTrack.position}
				</p>

				<SectionField
					label={oc.subtitleTrack.verticalY}
					beforeLabel={
						<span className="bg-muted text-foreground ml-auto rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums">
							{Math.round(posY)}px
						</span>
					}
				>
					<Slider
						min={-halfHeight + 60}
						max={halfHeight - 60}
						step={2}
						value={[posY]}
						onValueChange={(vals) => {
							const nextY = vals[0];
							if (typeof nextY === "number") {
								applyPatchToAllSubtitles({ "transform.positionY": nextY });
							}
						}}
					/>
				</SectionField>

				<div className="grid grid-cols-3 gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 text-[11px]"
						onClick={() =>
							applyPatchToAllSubtitles({
								"transform.positionY": Math.round(-canvasHeight * 0.32),
							})
						}
					>
						{oc.subtitleTrack.posTop}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 text-[11px]"
						onClick={() =>
							applyPatchToAllSubtitles({
								"transform.positionY": Math.round(canvasHeight * 0.08),
							})
						}
					>
						{oc.subtitleTrack.posCenter}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 text-[11px]"
						onClick={() =>
							applyPatchToAllSubtitles({
								"transform.positionY": Math.round(canvasHeight * 0.32),
							})
						}
					>
						{oc.subtitleTrack.posBottom}
					</Button>
				</div>
			</div>

			{/* Section 3: Strip Shape Visual Preview Grid */}
			<div className="space-y-2.5 px-3.5 py-3">
				<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
					{oc.subtitleTrack.stripShape}
				</p>

				<div className="grid grid-cols-2 gap-2" role="listbox" aria-label={oc.subtitleTrack.stripShape}>
					{STRIP_STYLE_OPTIONS.map((opt) => {
						const active = activeStripOption === opt.value;
						const topPreviewStyle = buildStripBadgePreviewStyle({
							shape: opt.value,
							bgColor: line1Bg,
							textColor: line1Text,
							fontFamily,
						});
						const bottomPreviewStyle = buildStripBadgePreviewStyle({
							shape: opt.value,
							bgColor: line2Bg,
							textColor: line2Text,
							fontFamily,
						});
						return (
							<button
								key={opt.value}
								type="button"
								role="option"
								aria-selected={active}
								onClick={() => {
									if (opt.value === "none") {
										applyPatchToAllSubtitles({ "background.enabled": false });
									} else {
										applyPatchToAllSubtitles({
											"background.enabled": true,
											"background.style": opt.value,
										});
									}
								}}
								className={cn(
									"flex cursor-pointer flex-col gap-1 rounded-md border p-1.5 text-left transition",
									active
										? "border-foreground bg-secondary shadow-xs"
										: "border-border bg-background hover:bg-muted/50",
								)}
							>
								<div className="flex h-11 w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-sm bg-zinc-800 px-1.5 py-1">
									<span
										style={topPreviewStyle}
										className="max-w-full truncate text-[9px] leading-tight select-none"
									>
										{opt.sampleTop}
									</span>
									<span
										style={bottomPreviewStyle}
										className="max-w-full truncate text-[9px] leading-tight select-none"
									>
										{opt.sampleBottom}
									</span>
								</div>
								<span className="truncate px-0.5 text-[11px] font-medium">
									{localizeBilingualLabel(opt.label, locale)}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Section 4: Duo Colors & Color Pickers */}
			<div className="space-y-3 px-3.5 py-3">
				<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
					{oc.subtitleTrack.duoColors}
				</p>

				<div className="grid grid-cols-3 gap-1.5">
					{DUO_COLOR_THEMES.map((theme) => (
						<button
							key={theme.id}
							type="button"
							onClick={() =>
								applyPatchToAllSubtitles({
									"background.color": theme.bg1,
									color: theme.text1,
									"background.secondaryColor": theme.bg2,
									"background.secondaryTextColor": theme.text2,
								})
							}
							className="border-border bg-background hover:bg-muted/60 flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition"
						>
							<span className="flex shrink-0 items-center -space-x-1">
								<span
									className="inline-block size-3 rounded-full border border-black/20"
									style={{ backgroundColor: theme.bg1 }}
								/>
								<span
									className="inline-block size-3 rounded-full border border-black/20"
									style={{ backgroundColor: theme.bg2 }}
								/>
							</span>
							<span className="truncate">{theme.label}</span>
						</button>
					))}
				</div>

				{bgEnabled ? (
					<div className="grid grid-cols-2 gap-2.5">
						<SectionField label={oc.subtitleTrack.strip1Bg}>
							<ColorPicker
								value={line1Bg.replace(/^#/, "").toUpperCase()}
								onChange={(c) =>
									applyPatchToAllSubtitles({ "background.color": `#${c}` })
								}
								onChangeEnd={(c) =>
									applyPatchToAllSubtitles({ "background.color": `#${c}` })
								}
							/>
						</SectionField>
						<SectionField label={oc.subtitleTrack.strip2Bg}>
							<ColorPicker
								value={line2Bg.replace(/^#/, "").toUpperCase()}
								onChange={(c) =>
									applyPatchToAllSubtitles({
										"background.secondaryColor": `#${c}`,
									})
								}
								onChangeEnd={(c) =>
									applyPatchToAllSubtitles({
										"background.secondaryColor": `#${c}`,
									})
								}
							/>
						</SectionField>
					</div>
				) : null}

				<div className="grid grid-cols-2 gap-2.5">
					<SectionField label={oc.subtitleTrack.text1Color}>
						<ColorPicker
							value={line1Text.replace(/^#/, "").toUpperCase()}
							onChange={(c) => applyPatchToAllSubtitles({ color: `#${c}` })}
							onChangeEnd={(c) => applyPatchToAllSubtitles({ color: `#${c}` })}
						/>
					</SectionField>
					<SectionField label={oc.subtitleTrack.text2Color}>
						<ColorPicker
							value={line2Text.replace(/^#/, "").toUpperCase()}
							onChange={(c) =>
								applyPatchToAllSubtitles({
									"background.secondaryTextColor": `#${c}`,
								})
							}
							onChangeEnd={(c) =>
								applyPatchToAllSubtitles({
									"background.secondaryTextColor": `#${c}`,
								})
							}
						/>
					</SectionField>
				</div>
			</div>

			<ScroSubtitleDesignDialog
				open={designDialogOpen}
				onOpenChange={setDesignDialogOpen}
				styles={allStyles}
				selectedId={selectedStyleId}
				fontFamilyOverride={fontFamily}
				fontLabel={fontLabel}
				busy={applyingDesign}
				generateLabel={oc.subtitleTrack.applyToTrack}
				generatingLabel={oc.subtitleTrack.applyingToTrack}
				confirmLabel={oc.subtitleTrack.applyToTrack}
				onSelectStyle={(id) => {
					setPickedStyleId(id);
					void applyDesignPresetToTrack(id);
				}}
				onConfirmGenerate={() => {
					void applyDesignPresetToTrack(selectedStyleId).then(() => {
						setDesignDialogOpen(false);
					});
				}}
			/>
		</div>
	);
}
