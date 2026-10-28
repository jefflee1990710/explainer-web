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
	singleLine?: boolean;
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
	isSingleLine: boolean;
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
		padding: bgEnabled ? "2px 9px" : undefined,
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
				? "2.5px 2.5px 0 #111111"
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
	const isSingleLine = Boolean(style.singleLine) || lines.length === 1;

	return {
		containerStyle: { background: preset.cardBg },
		line1Style,
		line2Style,
		lines: lines.length > 0 ? lines : [preset.sampleText],
		isSingleLine,
	};
}

// Wide, low-profile subtitle style strip cards that showcase only the subtitle lettering look.
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
		<div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2" role="listbox" aria-label={label}>
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
							"flex cursor-pointer flex-col gap-1 rounded-lg border p-1.5 text-left transition",
							active
								? "border-[#12141c] bg-[#f4f4f5] ring-2 ring-[#12141c]/15"
								: "border-[#e4e4e7] bg-white hover:border-[#12141c]/40 hover:bg-[#fafafa]",
						)}
					>
						{/* Wide, compact strip preview (not a tall 16:9 box) */}
						<div
							style={preview.containerStyle}
							className="flex h-14 w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md px-3 py-1.5"
						>
							{preview.lines.map((lineText, idx) => (
								<span
									key={idx}
									style={idx % 2 === 1 ? preview.line2Style : preview.line1Style}
									className={cn(
										"max-w-full truncate text-center leading-tight select-none",
										preview.isSingleLine ? "text-xs" : "text-[11px]",
									)}
								>
									{lineText}
								</span>
							))}
						</div>
						<div className="flex items-center justify-between gap-1.5 px-0.5">
							<span className="truncate text-[11px] font-semibold text-[#12141c]">
								{style.name}
							</span>
							<span className="shrink-0 rounded bg-[#f4f4f5] px-1.5 py-0.2 text-[9px] font-medium text-[#5c6170]">
								{preview.isSingleLine ? "單行 1-Line" : "雙行 2-Line"}
							</span>
						</div>
					</button>
				);
			})}
		</div>
	);
}
