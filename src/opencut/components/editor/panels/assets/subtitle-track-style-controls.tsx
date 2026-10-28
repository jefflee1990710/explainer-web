"use client";

import type { CSSProperties } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { isScroSubtitleName } from "@/opencut/embed/scro-subtitle-slots";
import { isSubtitleTrack } from "@/opencut/subtitles/insert";
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
import type { TextElement, TextTrack } from "@/opencut/timeline";
import type { TextBackgroundStyle } from "@/opencut/text/background";
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

// Batch controls for the dedicated Subtitle Track: font family with preview, font size,
// vertical Y position, visual strip shape preview cards, and dual-color customization.
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

	const inFontPresets = TEXT_FONT_PRESETS.some((item) => item.family === fontFamily);

	return (
		<div className="bg-muted/30 space-y-3 rounded-md border p-3">
			<div className="flex items-center justify-between gap-2">
				<div>
					<h3 className="text-xs font-semibold">
						字幕圖層全軌控制 · Subtitle Track ({targetElements.length})
					</h3>
					<p className="text-muted-foreground text-[11px]">
						一次過調整全部字幕嘅字體、大小、底條形狀、位置與雙色
					</p>
				</div>
				{compact ? (
					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="h-6 px-2 text-[11px]"
						onClick={selectAllOnTrack}
					>
						全選圖層
					</Button>
				) : null}
			</div>

			{/* Font Family with Live Preview */}
			<div className="space-y-1.5">
				<span className="block text-xs font-medium">字體類型 · Font Type</span>
				<Select
					value={fontFamily}
					onValueChange={(selected) => {
						const preset = TEXT_FONT_PRESETS.find((item) => item.family === selected);
						void loadFullFont({ family: selected, weights: preset?.weights }).finally(
							() => {
								applyPatchToAllSubtitles({ fontFamily: selected });
							},
						);
					}}
				>
					<SelectTrigger className="h-8 w-full text-xs">
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
										{preset.label ?? preset.family}
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
			</div>

			{/* Font Size Slider */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-xs">
					<span className="font-medium">字體大小 · Font Size</span>
					<span className="text-muted-foreground font-mono text-[11px]">
						{fontSize.toFixed(1)}
					</span>
				</div>
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
			</div>

			{/* Vertical Position Y */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-xs">
					<span className="font-medium">上下位置 · Vertical Y</span>
					<span className="text-muted-foreground font-mono text-[11px]">
						{Math.round(posY)}px
					</span>
				</div>
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
				<div className="grid grid-cols-3 gap-1.5 pt-0.5">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-6 text-[11px]"
						onClick={() =>
							applyPatchToAllSubtitles({
								"transform.positionY": Math.round(-canvasHeight * 0.32),
							})
						}
					>
						置頂 Top
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-6 text-[11px]"
						onClick={() =>
							applyPatchToAllSubtitles({
								"transform.positionY": Math.round(canvasHeight * 0.08),
							})
						}
					>
						中下 Center
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-6 text-[11px]"
						onClick={() =>
							applyPatchToAllSubtitles({
								"transform.positionY": Math.round(canvasHeight * 0.32),
							})
						}
					>
						置底 Bottom
					</Button>
				</div>
			</div>

			{/* Strip shape visual preview selector */}
			<div className="space-y-1.5">
				<span className="block text-xs font-medium">
					字卡底條形狀 · Strip Shape
				</span>
				<div className="grid grid-cols-2 gap-1.5" role="listbox" aria-label="Strip Shape">
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
										? "border-foreground bg-secondary ring-foreground/15 ring-2"
										: "border-border/70 bg-background hover:border-foreground/40",
								)}
							>
								<div className="flex h-11 w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded bg-zinc-800 px-1.5 py-1">
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
								<span className="truncate px-0.5 text-[10px] font-semibold">
									{opt.label}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Quick Duo-Color Theme Swatches */}
			<div className="space-y-1.5">
				<span className="text-xs font-medium">一鍵雙色主題 · Quick Duo Colors</span>
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
							className="hover:border-foreground/50 bg-background flex cursor-pointer items-center gap-1.5 rounded border px-1.5 py-1 text-[11px] font-medium transition"
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
			</div>

			{/* Batch Dual Colors */}
			<div className="grid grid-cols-2 gap-2">
				{bgEnabled ? (
					<>
						<div className="space-y-1">
							<span className="text-muted-foreground block text-[11px] font-medium">
								上行底色 (例如黑)
							</span>
							<ColorPicker
								value={line1Bg.replace(/^#/, "").toUpperCase()}
								onChange={(c) =>
									applyPatchToAllSubtitles({ "background.color": `#${c}` })
								}
								onChangeEnd={(c) =>
									applyPatchToAllSubtitles({ "background.color": `#${c}` })
								}
							/>
						</div>
						<div className="space-y-1">
							<span className="text-muted-foreground block text-[11px] font-medium">
								下行底色 (例如綠)
							</span>
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
						</div>
					</>
				) : null}
				<div className="space-y-1">
					<span className="text-muted-foreground block text-[11px] font-medium">
						上行字色 · Line 1 Text
					</span>
					<ColorPicker
						value={line1Text.replace(/^#/, "").toUpperCase()}
						onChange={(c) => applyPatchToAllSubtitles({ color: `#${c}` })}
						onChangeEnd={(c) => applyPatchToAllSubtitles({ color: `#${c}` })}
					/>
				</div>
				<div className="space-y-1">
					<span className="text-muted-foreground block text-[11px] font-medium">
						下行字色 · Line 2 Text
					</span>
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
				</div>
			</div>
		</div>
	);
}
