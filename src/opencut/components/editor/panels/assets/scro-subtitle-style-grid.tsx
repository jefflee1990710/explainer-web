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
	badgeStyle: CSSProperties;
	sampleText: string;
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
	const badgeStyle: CSSProperties = {
		fontFamily: `${quoteFontFamily({ fontFamily: family })}, sans-serif`,
		fontWeight: style.fontWeight === "bold" ? 800 : 500,
		fontStyle: style.fontStyle ?? "normal",
		color: style.color ?? "#FFFFFF",
		textShadow: shadows.length > 0 ? shadows.join(", ") : undefined,
		backgroundColor: bgEnabled ? style.background?.color : undefined,
		padding: bgEnabled ? "2px 8px" : undefined,
		borderRadius: bgEnabled ? `${Math.round((style.background?.cornerRadius ?? 16) * 0.35)}px` : undefined,
	};

	return {
		containerStyle: { background: preset.cardBg },
		badgeStyle,
		sampleText: preset.sampleText,
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
							className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-sm px-1.5"
						>
							<span
								style={preview.badgeStyle}
								className="truncate text-center text-xs leading-tight select-none"
							>
								{preview.sampleText}
							</span>
						</div>
						<span className="truncate px-0.5 text-xs font-medium">{style.name}</span>
					</button>
				);
			})}
		</div>
	);
}
