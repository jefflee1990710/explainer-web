import { FONT_SIZE_SCALE_REFERENCE } from "@/opencut/text/typography";
import {
	getTextVisualRect,
	measureTextBlock,
	setCanvasLetterSpacing,
} from "@/opencut/text/layout";
import { DEFAULTS } from "@/opencut/timeline/defaults";
import { mediaTimeFromSeconds } from "@/opencut/wasm";
import type { CreateTextElement } from "@/opencut/timeline";
import type { TextBackground } from "@/opencut/text/background";
import {
	quoteFontFamily,
	type TextAlign,
	type TextDecoration,
	type TextFontStyle,
	type TextFontWeight,
} from "@/opencut/text/primitives";
import {
	scaleSubtitleFontSizeForCanvas,
	tokenizeMixedSubtitleLine,
	wrapSubtitleTextWithMeasure,
} from "./artistic-presets";
import type { SubtitleCue, SubtitleStyleOverrides } from "./types";

export {
	scaleSubtitleFontSizeForCanvas,
	tokenizeMixedSubtitleLine,
	wrapSubtitleTextWithMeasure,
};

const SUBTITLE_MAX_WIDTH_RATIO = 0.84;
const SUBTITLE_BOTTOM_MARGIN_RATIO = 0.08;
const SUBTITLE_VERTICAL_BOTTOM_MARGIN_RATIO = 0.12;
const SUBTITLE_FONT_SIZE = 4.2;
const MEASUREMENT_CANVAS_SIZE = 4096;

function createMeasurementContext(): CanvasRenderingContext2D | null {
	if (typeof document === "undefined") return null;
	const canvas = document.createElement("canvas");
	canvas.width = MEASUREMENT_CANVAS_SIZE;
	canvas.height = MEASUREMENT_CANVAS_SIZE;
	return canvas.getContext("2d");
}

function measureLineWidth({
	ctx,
	text,
}: {
	ctx: CanvasRenderingContext2D;
	text: string;
}): number {
	return ctx.measureText(text).width;
}

function wrapSubtitleText({
	ctx,
	text,
	maxWidth,
	preferTwoLines,
}: {
	ctx: CanvasRenderingContext2D;
	text: string;
	maxWidth: number;
	preferTwoLines?: boolean;
}): string {
	const wrapped = wrapSubtitleTextWithMeasure({
		text,
		maxWidth,
		measure: (value) => measureLineWidth({ ctx, text: value }),
	});
	if (!preferTwoLines || wrapped.includes("\n")) {
		return wrapped;
	}
	const trimmed = wrapped.trim();
	const tokens = tokenizeMixedSubtitleLine(trimmed);
	const nonSpaceTokens = tokens.filter((t) => !/^\s+$/.test(t));
	if (nonSpaceTokens.length < 3) {
		return wrapped;
	}
	// Balance into 2 lines near the visual midpoint so dual-color strip styles showcase both strips.
	const totalWidth = measureLineWidth({ ctx, text: trimmed });
	let acc = "";
	let bestSplitIndex = -1;
	let bestDiff = Number.POSITIVE_INFINITY;
	for (let i = 0; i < tokens.length - 1; i++) {
		acc += tokens[i];
		const left = acc.trim();
		const right = tokens
			.slice(i + 1)
			.join("")
			.trim();
		if (!left || !right) continue;
		const wLeft = measureLineWidth({ ctx, text: left });
		const diff = Math.abs(wLeft - totalWidth / 2);
		if (diff < bestDiff) {
			bestDiff = diff;
			bestSplitIndex = i;
		}
	}
	if (bestSplitIndex >= 0) {
		const line1 = tokens
			.slice(0, bestSplitIndex + 1)
			.join("")
			.trim();
		const line2 = tokens
			.slice(bestSplitIndex + 1)
			.join("")
			.trim();
		if (line1 && line2) {
			return `${line1}\n${line2}`;
		}
	}
	return wrapped;
}

function measureWrappedTextBlock({
	ctx,
	content,
	canvasHeight,
	textAlign,
	background,
	fontSize,
	lineHeight,
}: {
	ctx: CanvasRenderingContext2D;
	content: string;
	canvasHeight: number;
	textAlign: TextAlign;
	background: TextBackground;
	fontSize: number;
	lineHeight: number;
}) {
	const scaledFontSize = fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
	const lineHeightPx = lineHeight * scaledFontSize;
	const lines = content.split("\n");
	const lineMetrics = lines.map((line) => ctx.measureText(line));

	const block = measureTextBlock({
		lineMetrics,
		lineHeightPx,
	});
	const visualRect = getTextVisualRect({
		textAlign,
		block,
		background,
		fontSizeRatio: fontSize / 15,
	});

	return {
		block,
		visualRect,
	};
}

function resolveSubtitleStyle({
	style,
	canvasSize,
}: {
	style: SubtitleStyleOverrides | undefined;
	canvasSize: { width: number; height: number };
}): {
	fontFamily: string;
	fontSize: number;
	color: string;
	textAlign: TextAlign;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	textDecoration: TextDecoration;
	letterSpacing: number;
	lineHeight: number;
	strokeColor: string;
	strokeWidth: number;
	shadowColor: string;
	shadowOffsetX: number;
	shadowOffsetY: number;
	shadowBlur: number;
	background: TextBackground;
	placement: NonNullable<SubtitleStyleOverrides["placement"]>;
} {
	const baseFontSize =
		style?.fontSizeRatioOfPlayHeight != null
			? style.fontSizeRatioOfPlayHeight * FONT_SIZE_SCALE_REFERENCE
			: (style?.fontSize ?? SUBTITLE_FONT_SIZE);
	const fontSize = scaleSubtitleFontSizeForCanvas({
		baseFontSize,
		canvasSize,
	});
	const defaultBottomMargin =
		canvasSize.height > canvasSize.width
			? SUBTITLE_VERTICAL_BOTTOM_MARGIN_RATIO
			: SUBTITLE_BOTTOM_MARGIN_RATIO;

	return {
		fontFamily: style?.fontFamily ?? "Arial",
		fontSize,
		color: style?.color ?? "#ffffff",
		textAlign: style?.textAlign ?? "center",
		fontWeight: style?.fontWeight ?? "bold",
		fontStyle: style?.fontStyle ?? "normal",
		textDecoration: style?.textDecoration ?? "none",
		letterSpacing: style?.letterSpacing ?? DEFAULTS.text.letterSpacing,
		lineHeight: style?.lineHeight ?? DEFAULTS.text.lineHeight,
		strokeColor: style?.strokeColor ?? "#000000",
		strokeWidth: style?.strokeWidth ?? 0,
		shadowColor: style?.shadowColor ?? "#000000",
		shadowOffsetX: style?.shadowOffsetX ?? 0,
		shadowOffsetY: style?.shadowOffsetY ?? 0,
		shadowBlur: style?.shadowBlur ?? 0,
		background: {
			...DEFAULTS.text.background,
			enabled: false,
			...(style?.background ?? {}),
		},
		placement: {
			verticalAlign: style?.placement?.verticalAlign ?? "bottom",
			marginLeftRatio: style?.placement?.marginLeftRatio,
			marginRightRatio: style?.placement?.marginRightRatio,
			marginVerticalRatio:
				style?.placement?.marginVerticalRatio ?? defaultBottomMargin,
		},
	};
}

function resolveTargetWidth({
	canvasWidth,
	placement,
}: {
	canvasWidth: number;
	placement: ReturnType<typeof resolveSubtitleStyle>["placement"];
}): number {
	const leftRatio = placement.marginLeftRatio ?? 0;
	const rightRatio = placement.marginRightRatio ?? 0;
	const hasExplicitMargins = leftRatio > 0 || rightRatio > 0;
	if (!hasExplicitMargins) {
		return canvasWidth * SUBTITLE_MAX_WIDTH_RATIO;
	}

	const availableWidth = canvasWidth * (1 - leftRatio - rightRatio);
	return Math.max(0, availableWidth);
}

function resolvePositionX({
	canvasWidth,
	textAlign,
	placement,
	visualRect,
}: {
	canvasWidth: number;
	textAlign: TextAlign;
	placement: ReturnType<typeof resolveSubtitleStyle>["placement"];
	visualRect: { left: number; width: number };
}): number {
	const leftMargin = canvasWidth * (placement.marginLeftRatio ?? 0);
	const rightMargin = canvasWidth * (placement.marginRightRatio ?? 0);
	const canvasCenterX = canvasWidth / 2;

	if (textAlign === "left") {
		return leftMargin - visualRect.left - canvasCenterX;
	}

	if (textAlign === "right") {
		return (
			canvasWidth -
			rightMargin -
			(visualRect.left + visualRect.width) -
			canvasCenterX
		);
	}

	const availableWidth = canvasWidth - leftMargin - rightMargin;
	const targetCenterX = leftMargin + availableWidth / 2;
	return (
		targetCenterX - (visualRect.left + visualRect.width / 2) - canvasCenterX
	);
}

function resolvePositionY({
	canvasHeight,
	placement,
	visualRect,
}: {
	canvasHeight: number;
	placement: ReturnType<typeof resolveSubtitleStyle>["placement"];
	visualRect: { top: number; height: number };
}): number {
	const margin =
		canvasHeight *
		(placement.marginVerticalRatio ?? SUBTITLE_BOTTOM_MARGIN_RATIO);
	const canvasCenterY = canvasHeight / 2;

	if (placement.verticalAlign === "top") {
		return margin - visualRect.top - canvasCenterY;
	}

	if (placement.verticalAlign === "middle") {
		const targetCenterY = canvasHeight / 2;
		return (
			targetCenterY - (visualRect.top + visualRect.height / 2) - canvasCenterY
		);
	}

	return (
		canvasHeight - margin - (visualRect.top + visualRect.height) - canvasCenterY
	);
}

export function buildSubtitleTextElement({
	index,
	caption,
	canvasSize,
}: {
	index: number;
	caption: SubtitleCue;
	canvasSize: { width: number; height: number };
}): CreateTextElement {
	const ctx = createMeasurementContext();
	const style = resolveSubtitleStyle({
		style: caption.style,
		canvasSize,
	});
	const fontFamily = quoteFontFamily({
		fontFamily: style.fontFamily,
	});
	const fontWeight = style.fontWeight;
	const fontStyle = style.fontStyle === "italic" ? "italic" : "normal";
	const scaledFontSize =
		style.fontSize * (canvasSize.height / FONT_SIZE_SCALE_REFERENCE);
	const fontString = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}, sans-serif`;
	const maxWidth = resolveTargetWidth({
		canvasWidth: canvasSize.width,
		placement: style.placement,
	});

	let content = caption.text;
	let positionX = 0;
	let positionY = 0;

	if (ctx) {
		ctx.font = fontString;
		setCanvasLetterSpacing({ ctx, letterSpacingPx: style.letterSpacing });
		const hasDuoColors = Boolean(
			style.background.secondaryColor || style.background.secondaryTextColor,
		);
		content = wrapSubtitleText({
			ctx,
			text: caption.text,
			maxWidth,
			preferTwoLines: hasDuoColors,
		});
		const measurement = measureWrappedTextBlock({
			ctx,
			content,
			canvasHeight: canvasSize.height,
			textAlign: style.textAlign,
			background: style.background,
			fontSize: style.fontSize,
			lineHeight: style.lineHeight,
		});
		positionX = resolvePositionX({
			canvasWidth: canvasSize.width,
			textAlign: style.textAlign,
			placement: style.placement,
			visualRect: measurement.visualRect,
		});
		positionY = resolvePositionY({
			canvasHeight: canvasSize.height,
			placement: style.placement,
			visualRect: measurement.visualRect,
		});
	}

	return {
		...DEFAULTS.text.element,
		name: caption.name ?? `Caption ${index + 1}`,
		duration: mediaTimeFromSeconds({ seconds: caption.duration }),
		startTime: mediaTimeFromSeconds({ seconds: caption.startTime }),
		params: {
			...DEFAULTS.text.element.params,
			content,
			fontSize: style.fontSize,
			fontFamily: style.fontFamily,
			color: style.color,
			textAlign: style.textAlign,
			fontWeight: style.fontWeight,
			fontStyle: style.fontStyle,
			textDecoration: style.textDecoration,
			letterSpacing: style.letterSpacing,
			lineHeight: style.lineHeight,
			strokeColor: style.strokeColor,
			strokeWidth: style.strokeWidth,
			shadowColor: style.shadowColor,
			shadowOffsetX: style.shadowOffsetX,
			shadowOffsetY: style.shadowOffsetY,
			shadowBlur: style.shadowBlur,
			"background.enabled": style.background.enabled,
			"background.color": style.background.color,
			"background.secondaryColor":
				style.background.secondaryColor ??
				DEFAULTS.text.background.secondaryColor,
			"background.secondaryTextColor":
				style.background.secondaryTextColor ??
				DEFAULTS.text.background.secondaryTextColor,
			"background.style":
				style.background.style ?? DEFAULTS.text.background.style,
			"background.cornerRadius":
				style.background.cornerRadius ?? DEFAULTS.text.background.cornerRadius,
			"background.paddingX":
				style.background.paddingX ?? DEFAULTS.text.background.paddingX,
			"background.paddingY":
				style.background.paddingY ?? DEFAULTS.text.background.paddingY,
			"background.offsetX":
				style.background.offsetX ?? DEFAULTS.text.background.offsetX,
			"background.offsetY":
				style.background.offsetY ?? DEFAULTS.text.background.offsetY,
			"transform.positionX": positionX,
			"transform.positionY": positionY,
		},
	};
}
