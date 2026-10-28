import type { TextCanvasContext, TextBlockMeasurement } from "@/opencut/text/layout";
import { DEFAULTS } from "@/opencut/timeline/defaults";
import { clamp } from "@/opencut/utils/math";
import {
	CORNER_RADIUS_MAX,
	CORNER_RADIUS_MIN,
	type TextBackgroundStyle,
} from "./background";
import {
	drawTextDecoration,
	getTextBackgroundRect,
	measureTextBlock,
	setCanvasLetterSpacing,
} from "./layout";
import { FONT_SIZE_SCALE_REFERENCE } from "./typography";

export type TextAlign = "left" | "center" | "right";
export type TextFontWeight = "normal" | "bold";
export type TextFontStyle = "normal" | "italic";
export type TextDecoration = "none" | "underline" | "line-through";

export interface TextLayoutParams {
	content: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	textAlign: TextAlign;
	textDecoration?: TextDecoration;
	letterSpacing?: number;
	lineHeight?: number;
}

export interface ResolvedTextLayout {
	scaledFontSize: number;
	canvasScale: number;
	fontString: string;
	letterSpacing: number;
	lineHeightPx: number;
	fontSizeRatio: number;
	textAlign: TextAlign;
	textDecoration: TextDecoration;
}

export interface MeasuredTextLayout extends ResolvedTextLayout {
	lines: string[];
	lineMetrics: TextMetrics[];
	block: TextBlockMeasurement;
}

export interface ResolvedTextBackgroundLike {
	enabled: boolean;
	color: string;
	secondaryColor?: string;
	secondaryTextColor?: string;
	style?: TextBackgroundStyle;
	paddingX: number;
	paddingY: number;
	offsetX: number;
	offsetY: number;
	cornerRadius: number;
}

export interface ResolvedTextArtStyle {
	strokeColor?: string;
	strokeWidth?: number;
	shadowColor?: string;
	shadowOffsetX?: number;
	shadowOffsetY?: number;
	shadowBlur?: number;
}

import { quoteFontFamily } from "@/opencut/subtitles/artistic-presets";

export { quoteFontFamily };

export function buildTextFontString({
	fontFamily,
	fontWeight,
	fontStyle,
	scaledFontSize,
}: {
	fontFamily: string;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	scaledFontSize: number;
}): string {
	return `${fontStyle} ${fontWeight} ${scaledFontSize}px ${quoteFontFamily({ fontFamily })}, sans-serif`;
}

export function resolveTextLayout({
	text,
	canvasHeight,
}: {
	text: TextLayoutParams;
	canvasHeight: number;
}): ResolvedTextLayout {
	const canvasScale = canvasHeight / FONT_SIZE_SCALE_REFERENCE;
	const scaledFontSize = text.fontSize * canvasScale;
	const fontWeight = text.fontWeight === "bold" ? "bold" : "normal";
	const fontStyle = text.fontStyle === "italic" ? "italic" : "normal";
	const letterSpacing = text.letterSpacing ?? DEFAULTS.text.letterSpacing;
	const lineHeightPx =
		scaledFontSize * (text.lineHeight ?? DEFAULTS.text.lineHeight);
	const fontSizeRatio = text.fontSize / 15;

	return {
		scaledFontSize,
		canvasScale,
		fontString: buildTextFontString({
			fontFamily: text.fontFamily,
			fontWeight,
			fontStyle,
			scaledFontSize,
		}),
		letterSpacing,
		lineHeightPx,
		fontSizeRatio,
		textAlign: text.textAlign,
		textDecoration: text.textDecoration ?? "none",
	};
}

export function measureTextLayout({
	text,
	canvasHeight,
	ctx,
}: {
	text: TextLayoutParams;
	canvasHeight: number;
	ctx: TextCanvasContext;
}): MeasuredTextLayout {
	const resolvedLayout = resolveTextLayout({ text, canvasHeight });
	const lines = text.content.split("\n");

	ctx.save();
	ctx.font = resolvedLayout.fontString;
	ctx.textBaseline = "middle";
	setCanvasLetterSpacing({
		ctx,
		letterSpacingPx: resolvedLayout.letterSpacing,
	});
	const lineMetrics = lines.map((line) => ctx.measureText(line));
	ctx.restore();

	const block = measureTextBlock({
		lineMetrics,
		lineHeightPx: resolvedLayout.lineHeightPx,
	});

	return {
		...resolvedLayout,
		lines,
		lineMetrics,
		block,
	};
}

// Deterministic PRNG (Mulberry32) so procedural torn/brush strips stay stable across frames.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hashTextSeed(str: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function buildTornStripPolygon({
	left,
	top,
	width,
	height,
	seed,
	roughness = 1,
}: {
	left: number;
	top: number;
	width: number;
	height: number;
	seed: number;
	roughness?: number;
}): Array<{ x: number; y: number }> {
	const rand = mulberry32(seed);
	const pts: Array<{ x: number; y: number }> = [];
	const scale = Math.max(0.45, Math.min(2, height / 64));
	const stepLong = Math.max(3, 5 * scale);
	const stepShort = Math.max(2.5, 4 * scale);

	const tearEdge = (
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		step: number,
		ampWave: number,
		ampTeeth: number,
		normalX: number,
		normalY: number,
	) => {
		const dx = x1 - x0;
		const dy = y1 - y0;
		const len = Math.hypot(dx, dy) || 1;
		const steps = Math.max(3, Math.floor(len / step));
		let wave = (rand() - 0.5) * ampWave;
		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			wave = wave * 0.72 + (rand() - 0.5) * ampWave * 1.1;
			const tooth =
				(rand() - 0.5) * 2 * ampTeeth +
				(rand() > 0.82 ? (rand() - 0.5) * ampTeeth * 2.2 : 0);
			const offset = (wave + tooth) * roughness * scale;
			const tang = (rand() - 0.5) * 1.5 * scale;
			pts.push({
				x: x0 + dx * t + normalX * offset + (dx / len) * tang,
				y: y0 + dy * t + normalY * offset + (dy / len) * tang,
			});
		}
	};

	const leftSkew = (rand() - 0.5) * 8 * scale;
	const rightSkew = (rand() - 0.5) * 8 * scale;
	tearEdge(
		left + leftSkew * 0.3,
		top,
		left + width + rightSkew * 0.3,
		top,
		stepLong,
		3.0,
		2.0,
		0,
		-1,
	);
	tearEdge(
		left + width + rightSkew * 0.3,
		top,
		left + width - rightSkew * 0.3,
		top + height,
		stepShort,
		5.2,
		3.4,
		1,
		0,
	);
	tearEdge(
		left + width - rightSkew * 0.3,
		top + height,
		left - leftSkew * 0.3,
		top + height,
		stepLong,
		3.0,
		2.0,
		0,
		1,
	);
	tearEdge(
		left - leftSkew * 0.3,
		top + height,
		left + leftSkew * 0.3,
		top,
		stepShort,
		5.2,
		3.4,
		-1,
		0,
	);
	return pts;
}

function buildBrushStripPolygon({
	left,
	top,
	width,
	height,
	seed,
}: {
	left: number;
	top: number;
	width: number;
	height: number;
	seed: number;
}): Array<{ x: number; y: number }> {
	const rand = mulberry32(seed);
	const pts: Array<{ x: number; y: number }> = [];
	const scale = Math.max(0.45, Math.min(2, height / 64));
	const steps = 24;
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const yOff =
			(Math.sin(t * Math.PI * 3 + rand()) * 1.4 + (rand() - 0.5) * 1.6) * scale;
		pts.push({ x: left + width * t, y: top + yOff });
	}
	const bristleCount = 9;
	for (let i = 1; i <= bristleCount; i++) {
		const t = i / bristleCount;
		const spike =
			(i % 2 === 1 ? 7 + rand() * 9 : -3.5 - rand() * 4.5) * scale;
		pts.push({ x: left + width + spike, y: top + height * t });
	}
	for (let i = steps; i >= 0; i--) {
		const t = i / steps;
		const yOff =
			(Math.cos(t * Math.PI * 2.5) * 1.4 + (rand() - 0.5) * 1.6) * scale;
		pts.push({ x: left + width * t, y: top + height + yOff });
	}
	for (let i = bristleCount - 1; i >= 1; i--) {
		const t = i / bristleCount;
		const spike =
			(i % 2 === 0 ? -6.5 - rand() * 7.5 : 3 + rand() * 4) * scale;
		pts.push({ x: left + spike, y: top + height * t });
	}
	return pts;
}

function tracePolygonPath(
	ctx: TextCanvasContext,
	pts: Array<{ x: number; y: number }>,
): void {
	ctx.beginPath();
	for (let i = 0; i < pts.length; i++) {
		if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
		else ctx.lineTo(pts[i].x, pts[i].y);
	}
	ctx.closePath();
}

export function drawMeasuredTextLayout({
	ctx,
	layout,
	textColor,
	background,
	backgroundColor,
	artStyle,
	textBaseline = "middle",
}: {
	ctx: TextCanvasContext;
	layout: MeasuredTextLayout;
	textColor: string;
	background?: ResolvedTextBackgroundLike | null;
	backgroundColor?: string;
	artStyle?: ResolvedTextArtStyle | null;
	textBaseline?: CanvasTextBaseline;
}): void {
	ctx.font = layout.fontString;
	ctx.textAlign = layout.textAlign;
	ctx.textBaseline = textBaseline;
	ctx.fillStyle = textColor;
	setCanvasLetterSpacing({ ctx, letterSpacingPx: layout.letterSpacing });

	const bgStyle: TextBackgroundStyle = background?.style ?? "rounded";
	const secondaryBgColor = background?.secondaryColor?.trim() || "";
	const secondaryTextColor = background?.secondaryTextColor?.trim() || "";
	const hasPerLineStrip =
		Boolean(background?.enabled) &&
		Boolean(backgroundColor) &&
		backgroundColor !== "transparent" &&
		layout.lines.length > 0 &&
		(bgStyle !== "rounded" ||
			(layout.lines.length > 1 &&
				Boolean(secondaryBgColor) &&
				secondaryBgColor !== backgroundColor));

	if (
		background?.enabled &&
		backgroundColor &&
		backgroundColor !== "transparent" &&
		layout.lines.length > 0
	) {
		if (hasPerLineStrip) {
			const padX =
				(background.paddingX ?? DEFAULTS.text.background.paddingX) *
				layout.fontSizeRatio;
			const padY =
				(background.paddingY ?? DEFAULTS.text.background.paddingY) *
				layout.fontSizeRatio;
			const offX = background.offsetX ?? 0;
			const offY = background.offsetY ?? 0;
			const stripHeight = Math.max(
				layout.scaledFontSize + padY * 1.4,
				layout.lineHeightPx * 0.9,
			);

			for (let index = 0; index < layout.lines.length; index++) {
				const lineText = layout.lines[index];
				if (!lineText.trim()) continue;
				const lineW = layout.lineMetrics[index]?.width ?? 0;
				const stripW = lineW + padX * 2;
				const lineY =
					index * layout.lineHeightPx - layout.block.visualCenterOffset + offY;
				const stripLeft =
					(layout.textAlign === "left"
						? -padX
						: layout.textAlign === "right"
							? -lineW - padX
							: -stripW / 2) + offX;
				const stripTop = lineY - stripHeight / 2;
				const isOdd = index % 2 === 1;
				const lineBg =
					isOdd && secondaryBgColor ? secondaryBgColor : backgroundColor;
				const lineFg =
					isOdd && secondaryTextColor ? secondaryTextColor : textColor;
				const seed = hashTextSeed(`${lineText}:${index}`);

				ctx.save();
				if (bgStyle === "torn") {
					const fiberPts = buildTornStripPolygon({
						left: stripLeft - 1.5,
						top: stripTop - 1,
						width: stripW + 3,
						height: stripHeight + 2,
						seed: seed + 99,
						roughness: 1.2,
					});
					const mainPts = buildTornStripPolygon({
						left: stripLeft,
						top: stripTop,
						width: stripW,
						height: stripHeight,
						seed,
						roughness: 1.0,
					});
					ctx.save();
					ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
					ctx.shadowBlur = Math.max(4, layout.scaledFontSize * 0.14);
					ctx.shadowOffsetY = Math.max(2, layout.scaledFontSize * 0.05);
					tracePolygonPath(ctx, fiberPts);
					ctx.fillStyle = isOdd
						? "rgba(235, 245, 225, 0.48)"
						: "rgba(235, 235, 230, 0.38)";
					ctx.fill();
					ctx.restore();

					tracePolygonPath(ctx, mainPts);
					ctx.fillStyle = lineBg;
					ctx.fill();
				} else if (bgStyle === "brush") {
					const brushPts = buildBrushStripPolygon({
						left: stripLeft,
						top: stripTop,
						width: stripW,
						height: stripHeight,
						seed,
					});
					ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
					ctx.shadowBlur = Math.max(6, layout.scaledFontSize * 0.16);
					ctx.shadowOffsetY = Math.max(2, layout.scaledFontSize * 0.06);
					tracePolygonPath(ctx, brushPts);
					ctx.fillStyle = lineBg;
					ctx.fill();
				} else if (bgStyle === "brutalist") {
					const off = Math.max(3, layout.scaledFontSize * 0.1);
					ctx.fillStyle = "#111111";
					ctx.fillRect(stripLeft + off, stripTop + off, stripW, stripHeight);
					ctx.fillStyle = lineBg;
					ctx.fillRect(stripLeft, stripTop, stripW, stripHeight);
					ctx.lineWidth = Math.max(2, layout.scaledFontSize * 0.065);
					ctx.strokeStyle = "#111111";
					ctx.strokeRect(stripLeft, stripTop, stripW, stripHeight);
				} else if (bgStyle === "skew") {
					const skewX = -Math.max(6, stripHeight * 0.17);
					ctx.beginPath();
					ctx.moveTo(stripLeft - skewX, stripTop);
					ctx.lineTo(stripLeft + stripW - skewX, stripTop);
					ctx.lineTo(stripLeft + stripW + skewX, stripTop + stripHeight);
					ctx.lineTo(stripLeft + skewX, stripTop + stripHeight);
					ctx.closePath();
					ctx.shadowColor = "#000000";
					ctx.shadowOffsetX = Math.max(3, layout.scaledFontSize * 0.09);
					ctx.shadowOffsetY = Math.max(3, layout.scaledFontSize * 0.09);
					ctx.shadowBlur = 0;
					ctx.fillStyle = lineBg;
					ctx.fill();
					ctx.lineWidth = Math.max(2, layout.scaledFontSize * 0.06);
					ctx.strokeStyle = "#111111";
					ctx.stroke();
				} else if (bgStyle === "neon") {
					ctx.beginPath();
					ctx.roundRect(
						stripLeft,
						stripTop,
						stripW,
						stripHeight,
						Math.max(6, stripHeight * 0.16),
					);
					ctx.fillStyle = lineBg;
					ctx.fill();
					ctx.shadowColor = lineFg;
					ctx.shadowBlur = Math.max(8, layout.scaledFontSize * 0.25);
					ctx.strokeStyle = lineFg;
					ctx.lineWidth = Math.max(1.5, layout.scaledFontSize * 0.04);
					ctx.stroke();
				} else if (bgStyle === "gold") {
					ctx.beginPath();
					ctx.roundRect(
						stripLeft,
						stripTop,
						stripW,
						stripHeight,
						Math.max(4, stripHeight * 0.1),
					);
					ctx.fillStyle = lineBg;
					ctx.fill();
					ctx.strokeStyle = "rgba(255, 213, 79, 0.58)";
					ctx.lineWidth = Math.max(1.2, layout.scaledFontSize * 0.03);
					ctx.stroke();
				} else {
					const p =
						clamp({
							value: background.cornerRadius,
							min: CORNER_RADIUS_MIN,
							max: CORNER_RADIUS_MAX,
						}) / 100;
					const radius = (Math.min(stripW, stripHeight) / 2) * p;
					ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
					ctx.shadowBlur = Math.max(6, layout.scaledFontSize * 0.18);
					ctx.shadowOffsetY = Math.max(2, layout.scaledFontSize * 0.06);
					ctx.beginPath();
					ctx.roundRect(stripLeft, stripTop, stripW, stripHeight, radius);
					ctx.fillStyle = lineBg;
					ctx.fill();
				}
				ctx.restore();
			}
			ctx.fillStyle = textColor;
		} else {
			const backgroundRect = getTextBackgroundRect({
				textAlign: layout.textAlign,
				block: layout.block,
				background: {
					...background,
					color: backgroundColor,
				},
				fontSizeRatio: layout.fontSizeRatio,
			});
			if (backgroundRect) {
				const p =
					clamp({
						value: background.cornerRadius,
						min: CORNER_RADIUS_MIN,
						max: CORNER_RADIUS_MAX,
					}) / 100;
				const radius =
					(Math.min(backgroundRect.width, backgroundRect.height) / 2) * p;
				ctx.fillStyle = backgroundColor;
				ctx.beginPath();
				ctx.roundRect(
					backgroundRect.left,
					backgroundRect.top,
					backgroundRect.width,
					backgroundRect.height,
					radius,
				);
				ctx.fill();
				ctx.fillStyle = textColor;
			}
		}
	}

	// Scale stroke and shadow proportionally to the actual rendered font size (~54px reference)
	// rather than raw canvasHeight so 9:16 vertical canvases never inflate strokes to 150px.
	const fontScale = Math.max(0.25, layout.scaledFontSize / 54);
	const strokeWidth = Math.max(0, artStyle?.strokeWidth ?? 0);
	const strokeColor = artStyle?.strokeColor || "#000000";
	const shadowColor = artStyle?.shadowColor || "#000000";
	const shadowOffsetX = (artStyle?.shadowOffsetX ?? 0) * fontScale * 1.5;
	const shadowOffsetY = (artStyle?.shadowOffsetY ?? 0) * fontScale * 1.5;
	const shadowBlur = Math.max(0, (artStyle?.shadowBlur ?? 0) * fontScale * 1.5);
	const hasShadow =
		Boolean(artStyle?.shadowColor) &&
		shadowColor !== "transparent" &&
		(shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0);
	const scaledStrokePx = strokeWidth * fontScale * 2;

	// 1. Shadow / 3D Block / Neon Glow pass
	if (hasShadow) {
		ctx.save();
		ctx.font = layout.fontString;
		ctx.textAlign = layout.textAlign;
		ctx.textBaseline = textBaseline;
		setCanvasLetterSpacing({ ctx, letterSpacingPx: layout.letterSpacing });

		if (shadowBlur > 0) {
			ctx.shadowColor = shadowColor;
			ctx.shadowBlur = shadowBlur;
			ctx.shadowOffsetX = shadowOffsetX;
			ctx.shadowOffsetY = shadowOffsetY;
			if (scaledStrokePx > 0) {
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = scaledStrokePx;
				ctx.lineJoin = "round";
				ctx.lineCap = "round";
				ctx.miterLimit = 2;
				for (let index = 0; index < layout.lines.length; index++) {
					const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
					ctx.strokeText(layout.lines[index], 0, lineY);
				}
			} else {
				for (let index = 0; index < layout.lines.length; index++) {
					const isOdd = index % 2 === 1;
					const lineFg =
						isOdd && secondaryTextColor ? secondaryTextColor : textColor;
					if (bgStyle === "neon") {
						ctx.shadowColor = lineFg;
					}
					ctx.fillStyle = lineFg;
					const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
					ctx.fillText(layout.lines[index], 0, lineY);
				}
			}
		} else {
			// Crisp 3D hard block shadow (retro / comic / pop variety look)
			if (scaledStrokePx > 0) {
				ctx.strokeStyle = shadowColor;
				ctx.lineWidth = scaledStrokePx;
				ctx.lineJoin = "round";
				ctx.lineCap = "round";
				ctx.miterLimit = 2;
				for (let index = 0; index < layout.lines.length; index++) {
					const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
					ctx.strokeText(layout.lines[index], shadowOffsetX, lineY + shadowOffsetY);
				}
			}
			ctx.fillStyle = shadowColor;
			for (let index = 0; index < layout.lines.length; index++) {
				const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
				ctx.fillText(layout.lines[index], shadowOffsetX, lineY + shadowOffsetY);
			}
		}
		ctx.restore();
	}

	// 2. Outer Stroke pass (drawn before fill so inner letterforms stay sharp)
	if (scaledStrokePx > 0 && strokeColor !== "transparent") {
		ctx.save();
		ctx.font = layout.fontString;
		ctx.textAlign = layout.textAlign;
		ctx.textBaseline = textBaseline;
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = scaledStrokePx;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.miterLimit = 2;
		setCanvasLetterSpacing({ ctx, letterSpacingPx: layout.letterSpacing });

		for (let index = 0; index < layout.lines.length; index++) {
			const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
			ctx.strokeText(layout.lines[index], 0, lineY);
		}
		ctx.restore();
	}

	// 3. Main Fill & Decoration pass (supports alternating secondaryTextColor on odd lines)
	for (let index = 0; index < layout.lines.length; index++) {
		const isOdd = index % 2 === 1;
		const lineFg = isOdd && secondaryTextColor ? secondaryTextColor : textColor;
		ctx.fillStyle = lineFg;
		const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
		ctx.fillText(layout.lines[index], 0, lineY);
		drawTextDecoration({
			ctx,
			textDecoration: layout.textDecoration,
			lineWidth: layout.lineMetrics[index].width,
			lineY,
			metrics: layout.lineMetrics[index],
			scaledFontSize: layout.scaledFontSize,
			textAlign: layout.textAlign,
		});
	}
}

export function strokeMeasuredTextLayout({
	ctx,
	layout,
	strokeColor,
	strokeWidth,
	textBaseline = "middle",
}: {
	ctx: TextCanvasContext;
	layout: MeasuredTextLayout;
	strokeColor: string;
	strokeWidth: number;
	textBaseline?: CanvasTextBaseline;
}): void {
	ctx.font = layout.fontString;
	ctx.textAlign = layout.textAlign;
	ctx.textBaseline = textBaseline;
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = strokeWidth;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	setCanvasLetterSpacing({ ctx, letterSpacingPx: layout.letterSpacing });

	for (let index = 0; index < layout.lines.length; index++) {
		const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
		ctx.strokeText(layout.lines[index], 0, lineY);
	}
}
