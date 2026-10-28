"use client";

import type { CSSProperties } from "react";
import { resolveArtisticSubtitlePreset } from "@/opencut/subtitles/artistic-presets";
import { quoteFontFamily } from "@/opencut/text/primitives";
import { cn } from "@/opencut/utils/ui";

export type SubtitleStyleCard = {
	id: string;
	name: string;
	previewUrl: string;
	drawLook?: string;
};

function buildCardTextStyle({
	lookId,
	fontFamilyOverride,
}: {
	lookId: string;
	fontFamilyOverride?: string | null;
}): {
	containerStyle: CSSProperties;
	line1Style: CSSProperties;
	line2Style: CSSProperties;
	lines: string[];
} {
	const preset = resolveArtisticSubtitlePreset(lookId);
	const { style } = preset;
	const family = fontFamilyOverride?.trim() || preset.defaultFontFamily;
	const strokeWidth = style.strokeWidth ?? 0;
	const strokeColor = style.strokeColor ?? "#000000";
	const shadowColor = style.shadowColor ?? "#000000";
	const sx = Math.round((style.shadowOffsetX ?? 0) * 0.85);
	const sy = Math.round((style.shadowOffsetY ?? 0) * 0.85);
	const sblur = Math.round((style.shadowBlur ?? 0) * 0.85);

	const shadows: string[] = [];
	if (strokeWidth > 0) {
		const sw = Math.max(1, Math.round(strokeWidth * 0.55));
		shadows.push(
			`${-sw}px ${-sw}px 0 ${strokeColor}`,
			`${sw}px ${-sw}px 0 ${strokeColor}`,
			`${-sw}px ${sw}px 0 ${strokeColor}`,
			`${sw}px ${sw}px 0 ${strokeColor}`,
			`0px ${-sw}px 0 ${strokeColor}`,
			`0px ${sw}px 0 ${strokeColor}`,
			`${-sw}px 0px 0 ${strokeColor}`,
			`${sw}px 0px 0 ${strokeColor}`,
		);
	}
	if (sblur > 0 || sx !== 0 || sy !== 0) {
		shadows.push(`${sx}px ${sy}px ${sblur}px ${shadowColor}`);
	}

	const bgEnabled = Boolean(style.background?.enabled);
	const bgStyle = style.background?.style ?? "rounded";
	const radiusPx =
		bgStyle === "rounded"
			? `${Math.round((style.background?.cornerRadius ?? 30) * 0.25)}px`
			: bgStyle === "torn" || bgStyle === "brush"
				? "2px"
				: "3px";

	const baseBadge: CSSProperties = {
		fontFamily: `${quoteFontFamily({ fontFamily: family })}, sans-serif`,
		fontWeight: style.fontWeight === "bold" ? 800 : 500,
		fontStyle: style.fontStyle ?? "normal",
		textShadow: shadows.length > 0 ? shadows.join(", ") : undefined,
		padding: bgEnabled ? "1px 6px" : undefined,
		borderRadius: bgEnabled ? radiusPx : undefined,
		border:
			bgEnabled && (bgStyle === "brutalist" || bgStyle === "skew")
				? "1.5px solid #111111"
				: bgEnabled && bgStyle === "neon"
					? `1px solid ${style.color ?? "#00F5FF"}`
					: bgEnabled && bgStyle === "gold"
						? "1px solid rgba(255,213,79,0.55)"
						: undefined,
		boxShadow:
			bgEnabled && bgStyle === "brutalist"
				? "2px 2px 0 #111111"
				: bgEnabled && bgStyle === "torn"
					? "0 1px 3px rgba(0,0,0,0.28)"
					: undefined,
		transform: bgEnabled && bgStyle === "skew" ? "skewX(-10deg)" : undefined,
	};

	const line1Style: CSSProperties = {
		...baseBadge,
		color: style.color ?? "#FFFFFF",
		backgroundColor: bgEnabled ? style.background?.color : undefined,
	};

	const line2Style: CSSProperties = {
		...baseBadge,
		color: style.background?.secondaryTextColor ?? style.color ?? "#FFFFFF",
		backgroundColor: bgEnabled
			? (style.background?.secondaryColor ?? style.background?.color)
			: undefined,
		border:
			bgEnabled && bgStyle === "neon"
				? `1px solid ${style.background?.secondaryTextColor ?? "#FF2E93"}`
				: baseBadge.border,
	};

	const lines = preset.sampleText.split("\n").filter(Boolean);

	return {
		containerStyle: { background: preset.cardBg },
		line1Style,
		line2Style,
		lines: lines.length > 0 ? lines : [preset.sampleText],
	};
}

// Artistic subtitle style cards rendered with live bilingual Google Fonts + stroke/shadow/pill styling.
export function ScroSubtitleStyleGrid({
	styles,
	selectedId,
	fontFamilyOverride,
	label,
	onSelect,
}: {
	styles: SubtitleStyleCard[];
	selectedId: string;
	fontFamilyOverride?: string | null;
	label: string;
	onSelect: (id: string) => void;
}) {
	return (
		<div className="mt-2 grid grid-cols-2 gap-2" role="listbox" aria-label={label}>
			{styles.map((style) => {
				const active = style.id === selectedId;
				const lookId = style.drawLook || style.id;
				const preview = buildCardTextStyle({
					lookId,
					fontFamilyOverride,
				});
				return (
					<button
						key={style.id}
						type="button"
						role="option"
						aria-selected={active}
						onClick={() => onSelect(style.id)}
						className={cn(
							"flex flex-col gap-1 rounded-md border p-1 text-left transition",
							active
								? "border-foreground bg-secondary shadow-xs"
								: "border-transparent hover:bg-muted",
						)}
					>
						<div
							style={preview.containerStyle}
							className="flex aspect-video w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-sm px-1.5"
						>
							{preview.lines.map((lineText, idx) => (
								<span
									key={idx}
									style={idx % 2 === 1 ? preview.line2Style : preview.line1Style}
									className="max-w-full truncate text-center text-[10px] leading-tight select-none"
								>
									{lineText}
								</span>
							))}
						</div>
						<span className="truncate px-0.5 text-xs font-medium">{style.name}</span>
					</button>
				);
			})}
		</div>
	);
}
