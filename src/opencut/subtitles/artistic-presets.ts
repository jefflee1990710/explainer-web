import type { SubtitleStyleOverrides } from "./types";
import {
	EXTRA_ARTISTIC_SUBTITLE_PRESETS,
	EXTRA_SUBTITLE_STYLE_CARDS,
} from "./extra-presets";

export { EXTRA_SUBTITLE_STYLE_CARDS };

// Landscape (16:9 / 1:1): default near the bottom edge (8% inset from bottom).
export const SUBTITLE_BOTTOM_MARGIN_RATIO = 0.08;
// Vertical Reel (9:16): default just below the vertical middle (~60–62% from top, 34% above bottom).
export const SUBTITLE_VERTICAL_BOTTOM_MARGIN_RATIO = 0.34;

export function defaultSubtitleVerticalMarginRatio(canvasSize: {
	width: number;
	height: number;
}): number {
	return canvasSize.height > canvasSize.width
		? SUBTITLE_VERTICAL_BOTTOM_MARGIN_RATIO
		: SUBTITLE_BOTTOM_MARGIN_RATIO;
}

const GENERIC_CSS_FAMILIES = new Set([
	"sans-serif",
	"serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui",
]);

export function quoteFontFamily({ fontFamily }: { fontFamily: string }): string {
	const parts = fontFamily
		.split(",")
		.map((part) => part.trim().replace(/^["']|["']$/g, "").trim())
		.filter(Boolean);
	if (parts.length === 0) return '"Arial"';
	return parts
		.map((part) =>
			GENERIC_CSS_FAMILIES.has(part.toLowerCase())
				? part.toLowerCase()
				: `"${part.replace(/"/g, '\\"')}"`,
		)
		.join(", ");
}

/**
 * Tokenizes mixed CJK (Chinese/Cantonese/Japanese/Korean) and Latin text so line wrapping
 * can break cleanly between CJK characters (keeping trailing punctuation attached)
 * while keeping English words and numbers intact.
 */
export function tokenizeMixedSubtitleLine(text: string): string[] {
	const tokens: string[] = [];
	const regex =
		/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}][，。！？；：、）】」』》”’,.!?;:)\]]*|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}—–]+[—–]*|[—–]+|\s+/gu;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		tokens.push(match[0]);
	}
	return tokens;
}

/**
 * Balances a single paragraph into 2 lines with near-equal word/token count and width
 * when the text fits within 2 lines, preventing top-heavy 2-line captions like
 * "Watch how this rooftop chart changes / everything".
 */
export function balanceTwoLineSubtitle({
	text,
	maxWidth,
	measure,
}: {
	text: string;
	maxWidth: number;
	measure: (value: string) => number;
}): string | null {
	const trimmed = text.trim().replace(/\s+/g, " ");
	if (!trimmed) return null;
	const tokens = tokenizeMixedSubtitleLine(trimmed);
	const nonSpaceIndices: number[] = [];
	for (let i = 0; i < tokens.length; i++) {
		if (!/^\s+$/.test(tokens[i])) nonSpaceIndices.push(i);
	}
	if (nonSpaceIndices.length < 2) return null;

	const totalUnits = nonSpaceIndices.length;
	const totalWidth = measure(trimmed);
	let bestSplitTokenIdx = -1;
	let bestScore = Number.POSITIVE_INFINITY;

	for (let k = 0; k < nonSpaceIndices.length - 1; k++) {
		const splitIdx = nonSpaceIndices[k];
		const line1 = tokens
			.slice(0, splitIdx + 1)
			.join("")
			.trim();
		const line2 = tokens
			.slice(splitIdx + 1)
			.join("")
			.trim();
		if (!line1 || !line2) continue;

		const w1 = measure(line1);
		const w2 = measure(line2);
		if (w1 > maxWidth || w2 > maxWidth) continue;

		const leftUnits = k + 1;
		const rightUnits = totalUnits - leftUnits;
		// Balance word/token count first, with visual width ratio as tie-breaker
		const unitDiffRatio = Math.abs(leftUnits - rightUnits) / totalUnits;
		const widthDiffRatio =
			totalWidth > 0 ? Math.abs(w1 - w2) / totalWidth : 0;
		const score = unitDiffRatio * 0.65 + widthDiffRatio * 0.35;

		if (score < bestScore) {
			bestScore = score;
			bestSplitTokenIdx = splitIdx;
		}
	}

	if (bestSplitTokenIdx < 0) return null;
	const line1 = tokens
		.slice(0, bestSplitTokenIdx + 1)
		.join("")
		.trim();
	const line2 = tokens
		.slice(bestSplitTokenIdx + 1)
		.join("")
		.trim();
	return line1 && line2 ? `${line1}\n${line2}` : null;
}

export function wrapSubtitleTextWithMeasure({
	text,
	maxWidth,
	measure,
	preferTwoLines = false,
}: {
	text: string;
	maxWidth: number;
	measure: (value: string) => number;
	preferTwoLines?: boolean;
}): string {
	const normalized = text.trim().replace(/\r\n/g, "\n");
	const paragraphs = normalized.split("\n");
	const wrappedParagraphs: string[] = [];

	for (const paragraph of paragraphs) {
		const trimmedParagraph = paragraph.trim();
		if (!trimmedParagraph) {
			wrappedParagraphs.push("");
			continue;
		}

		const tokens = tokenizeMixedSubtitleLine(trimmedParagraph);
		let currentLine = "";
		const lines: string[] = [];

		for (const token of tokens) {
			if (!currentLine && /^\s+$/.test(token)) {
				continue;
			}
			const candidate = currentLine + token;
			if (!currentLine || measure(candidate.trimEnd()) <= maxWidth) {
				currentLine = candidate;
				continue;
			}

			lines.push(currentLine.trimEnd());
			currentLine = /^\s+$/.test(token) ? "" : token;
		}

		if (currentLine.trim()) {
			lines.push(currentLine.trimEnd());
		}

		// Whenever greedy wrapping produced 2 lines (e.g. 6 words on line 1 + 1 orphan word on line 2),
		// or when preferTwoLines is requested on a long-enough 1-line caption, rebalance into 2 equal wide lines.
		const hasCjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
			trimmedParagraph,
		);
		const longEnoughForTwoLines = hasCjk
			? trimmedParagraph.length >= 8
			: trimmedParagraph.length >= 18 && trimmedParagraph.split(/\s+/).length >= 4;
		if (
			lines.length === 2 ||
			(preferTwoLines && lines.length === 1 && longEnoughForTwoLines)
		) {
			const balanced = balanceTwoLineSubtitle({
				text: trimmedParagraph,
				maxWidth,
				measure,
			});
			if (balanced) {
				wrappedParagraphs.push(balanced);
				continue;
			}
		}

		// If greedy wrapping spilled into 3+ lines, check if a balanced 2-line split fits within a slightly wider bound
		// (the font-size auto-tuner will then scale fontSize down so the 2 wide lines fit with left/right padding).
		if (lines.length >= 3) {
			const balancedWide = balanceTwoLineSubtitle({
				text: trimmedParagraph,
				maxWidth: maxWidth * 1.22,
				measure,
			});
			if (balancedWide) {
				wrappedParagraphs.push(balancedWide);
				continue;
			}
		}

		wrappedParagraphs.push(lines.join("\n"));
	}

	return wrappedParagraphs.join("\n");
}

export type ArtisticSubtitlePreset = {
	id: string;
	/** Default bilingual Google Font stack for this artistic look. */
	defaultFontFamily: string;
	/** Backdrop color for the live CSS preview card in the Subtitle panel. */
	cardBg: string;
	/** Sample text shown on the live preview card. */
	sampleText: string;
	style: SubtitleStyleOverrides;
};

export const ARTISTIC_SUBTITLE_PRESETS: Record<string, ArtisticSubtitlePreset> = {
	bold: {
		id: "bold",
		defaultFontFamily: "Anton, Dela Gothic One, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
		sampleText: "爆款金句\nFocus Now!",
		style: {
			fontFamily: "Anton, Dela Gothic One, Noto Sans TC",
			fontSize: 4.4,
			fontWeight: "bold",
			lineHeight: 1.42,
			color: "#FFFFFF",
			strokeColor: "#000000",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			shadowBlur: 0,
			background: {
				enabled: true,
				style: "brush",
				color: "#111318",
				secondaryColor: "#FFE600",
				secondaryTextColor: "#111111",
				cornerRadius: 8,
				paddingX: 28,
				paddingY: 16,
			},
		},
	},
	clean: {
		id: "clean",
		defaultFontFamily: "Noto Sans TC, Montserrat, sans-serif",
		cardBg: "linear-gradient(135deg, #dedcd6 0%, #cfccc4 100%)",
		sampleText: "我真係奉勸大家\n千祈唔好再捱夜喇",
		style: {
			fontFamily: "Noto Sans TC, Montserrat, sans-serif",
			fontSize: 4.2,
			fontWeight: "bold",
			lineHeight: 1.38,
			color: "#FFFFFF",
			strokeColor: "rgba(0, 0, 0, 0.75)",
			strokeWidth: 2,
			shadowColor: "rgba(0, 0, 0, 0.85)",
			shadowOffsetX: 0,
			shadowOffsetY: 2,
			shadowBlur: 8,
			background: {
				enabled: false,
				style: "torn",
				color: "#151515",
				secondaryColor: "#64E338",
				secondaryTextColor: "#141414",
				cornerRadius: 4,
				paddingX: 28,
				paddingY: 16,
			},
		},
	},
	handwritten: {
		id: "handwritten",
		defaultFontFamily: "Montserrat, LXGW WenKai TC, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
		sampleText: "重點筆記\nBuild & Scale",
		style: {
			fontFamily: "Montserrat, LXGW WenKai TC, Noto Sans TC",
			fontSize: 4.3,
			fontWeight: "bold",
			lineHeight: 1.42,
			color: "#12141C",
			strokeColor: "#000000",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			shadowBlur: 0,
			background: {
				enabled: true,
				style: "rounded",
				color: "#FFFDF7",
				secondaryColor: "#3B82F6",
				secondaryTextColor: "#FFFFFF",
				cornerRadius: 70,
				paddingX: 28,
				paddingY: 16,
			},
		},
	},
	neon: {
		id: "neon",
		defaultFontFamily: "Chakra Petch, Zen Maru Gothic, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)",
		sampleText: "霓虹發光\nCYBER NEON",
		style: {
			fontFamily: "Chakra Petch, Zen Maru Gothic, Noto Sans TC",
			fontSize: 4.3,
			fontWeight: "bold",
			lineHeight: 1.44,
			color: "#00F5FF",
			strokeColor: "#081B33",
			strokeWidth: 0,
			shadowColor: "#FF00A0",
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			shadowBlur: 12,
			background: {
				enabled: true,
				style: "neon",
				color: "#090D18",
				secondaryColor: "#160A24",
				secondaryTextColor: "#FF2E93",
				cornerRadius: 18,
				paddingX: 26,
				paddingY: 14,
			},
		},
	},
	comic: {
		id: "comic",
		defaultFontFamily: "Oswald, Reggae One, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
		sampleText: "熱血漫畫\nCOMIC POP!",
		style: {
			fontFamily: "Oswald, Reggae One, Noto Sans TC",
			fontSize: 4.4,
			fontWeight: "bold",
			lineHeight: 1.44,
			color: "#111111",
			strokeColor: "#111111",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			shadowBlur: 0,
			background: {
				enabled: true,
				style: "skew",
				color: "#FFEB3B",
				secondaryColor: "#FF2E4C",
				secondaryTextColor: "#FFFFFF",
				cornerRadius: 0,
				paddingX: 28,
				paddingY: 16,
			},
		},
	},
	chalk: {
		id: "chalk",
		defaultFontFamily: "Permanent Marker, Yomogi, LXGW WenKai TC, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #14532d 0%, #064e3b 100%)",
		sampleText: "黑板粉筆\nChalk Note",
		style: {
			fontFamily: "Permanent Marker, Yomogi, LXGW WenKai TC, Noto Sans TC",
			fontSize: 4.4,
			fontWeight: "bold",
			color: "#F8FAFC",
			strokeColor: "#0F172A",
			strokeWidth: 2,
			shadowColor: "#000000",
			shadowOffsetX: 1,
			shadowOffsetY: 2,
			shadowBlur: 4,
			background: {
				enabled: false,
				color: "#14532D",
				secondaryColor: "#064E3B",
				secondaryTextColor: "#FFE600",
			},
		},
	},
	gold: {
		id: "gold",
		defaultFontFamily: "Playfair Display, Noto Serif TC",
		cardBg: "linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)",
		sampleText: "黑金質感\nLuxury Gold",
		style: {
			fontFamily: "Playfair Display, Noto Serif TC",
			fontSize: 4.3,
			fontWeight: "bold",
			lineHeight: 1.42,
			color: "#FFFFFF",
			strokeColor: "#2A1B00",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 2,
			shadowBlur: 6,
			background: {
				enabled: true,
				style: "gold",
				color: "#11100F",
				secondaryColor: "#1A1610",
				secondaryTextColor: "#FFD54F",
				cornerRadius: 12,
				paddingX: 28,
				paddingY: 15,
			},
		},
	},
	typewriter: {
		id: "typewriter",
		defaultFontFamily: "Montserrat, Source Code Pro, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #e5e0d5 0%, #d6cfc2 100%)",
		sampleText: "AI 唔會取代你\n但識用 AI 嘅人會！",
		style: {
			fontFamily: "Montserrat, Source Code Pro, Noto Sans TC",
			fontSize: 4.2,
			fontWeight: "bold",
			lineHeight: 1.44,
			color: "#111111",
			strokeColor: "#000000",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			shadowBlur: 0,
			background: {
				enabled: true,
				style: "brutalist",
				color: "#FFFDF7",
				secondaryColor: "#FF5722",
				secondaryTextColor: "#FFFFFF",
				cornerRadius: 0,
				paddingX: 26,
				paddingY: 15,
			},
		},
	},
	graffiti: {
		id: "graffiti",
		defaultFontFamily: "Bebas Neue, RocknRoll One, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #27272a 0%, #18181b 100%)",
		sampleText: "街頭塗鴉\nStreet Vibe",
		style: {
			fontFamily: "Bebas Neue, RocknRoll One, Noto Sans TC",
			fontSize: 4.5,
			fontWeight: "bold",
			color: "#FF2E93",
			strokeColor: "#FFFFFF",
			strokeWidth: 3,
			shadowColor: "#12141C",
			shadowOffsetX: 2.5,
			shadowOffsetY: 3.5,
			shadowBlur: 0,
			background: {
				enabled: false,
				color: "#18181B",
				secondaryColor: "#FF2E93",
				secondaryTextColor: "#FFE600",
			},
		},
	},
	sticker: {
		id: "sticker",
		defaultFontFamily: "Fredoka, Mochiy Pop One, Zen Maru Gothic, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
		sampleText: "立體貼紙\n10x Growth!",
		style: {
			fontFamily: "Fredoka, Mochiy Pop One, Zen Maru Gothic, Noto Sans TC",
			fontSize: 4.4,
			fontWeight: "bold",
			lineHeight: 1.38,
			color: "#FF2E2E",
			strokeColor: "#FFFFFF",
			strokeWidth: 4.2,
			shadowColor: "#0F172A",
			shadowOffsetX: 2,
			shadowOffsetY: 3.5,
			shadowBlur: 4,
			background: {
				enabled: false,
				color: "#FFFFFF",
				secondaryColor: "#FFFFFF",
				secondaryTextColor: "#2563EB",
			},
		},
	},
	glitch: {
		id: "glitch",
		defaultFontFamily: "Chakra Petch, DotGothic16, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
		sampleText: "數碼故障\nAI Matrix",
		style: {
			fontFamily: "Chakra Petch, DotGothic16, Noto Sans TC",
			fontSize: 4.4,
			fontWeight: "bold",
			color: "#FFFFFF",
			strokeColor: "#00F0FF",
			strokeWidth: 2,
			shadowColor: "#FF0055",
			shadowOffsetX: 2.5,
			shadowOffsetY: 2,
			shadowBlur: 0,
			background: {
				enabled: false,
				color: "#09090B",
				secondaryColor: "#18181B",
				secondaryTextColor: "#00F0FF",
			},
		},
	},
	brush: {
		id: "brush",
		defaultFontFamily: "Caveat, LXGW WenKai TC, Noto Serif TC",
		cardBg: "linear-gradient(135deg, #292524 0%, #1c1917 100%)",
		sampleText: "書法勁筆\nInk Master",
		style: {
			fontFamily: "Caveat, LXGW WenKai TC, Noto Serif TC",
			fontSize: 4.5,
			fontWeight: "bold",
			color: "#FFFFFF",
			strokeColor: "#111111",
			strokeWidth: 3,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 2.5,
			shadowBlur: 6,
			background: {
				enabled: false,
				color: "#1C1917",
				secondaryColor: "#292524",
				secondaryTextColor: "#FDE047",
			},
		},
	},
	outline: {
		id: "outline",
		defaultFontFamily: "Anton, Rampart One, Dela Gothic One, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
		sampleText: "立體空心\n3D POP",
		style: {
			fontFamily: "Anton, Rampart One, Dela Gothic One, Noto Sans TC",
			fontSize: 4.5,
			fontWeight: "bold",
			color: "#FFFFFF",
			strokeColor: "#1E3A8A",
			strokeWidth: 3.5,
			shadowColor: "#C6F24B",
			shadowOffsetX: 2.5,
			shadowOffsetY: 2.5,
			shadowBlur: 0,
			background: {
				enabled: false,
				color: "#1E3A8A",
				secondaryColor: "#0F172A",
				secondaryTextColor: "#C6F24B",
			},
		},
	},
	...EXTRA_ARTISTIC_SUBTITLE_PRESETS,
};

export function resolveArtisticSubtitlePreset(lookId?: string): ArtisticSubtitlePreset {
	if (lookId && lookId in ARTISTIC_SUBTITLE_PRESETS) {
		return ARTISTIC_SUBTITLE_PRESETS[lookId];
	}
	return ARTISTIC_SUBTITLE_PRESETS.bold;
}

/**
 * OpenCut scales fontSize against `canvasHeight / 90`. On a 9:16 vertical canvas
 * (1080×1920), `canvasHeight` is 1.78× larger while `canvasWidth` is 0.56× narrower.
 * Scaling the base subtitle fontSize by `min(width, height) / height` keeps the
 * rendered pixel height (~48–54px on 1080p) consistent across 9:16, 1:1, and 16:9.
 */
export function scaleSubtitleFontSizeForCanvas({
	baseFontSize,
	canvasSize,
}: {
	baseFontSize: number;
	canvasSize: { width: number; height: number };
}): number {
	if (canvasSize.height <= 0 || canvasSize.width <= 0) return baseFontSize;
	const aspectFactor =
		canvasSize.height > canvasSize.width
			? canvasSize.width / canvasSize.height
			: 1;
	return Math.max(1.5, Math.round(baseFontSize * aspectFactor * 10) / 10);
}

/**
 * Pure helper that tunes `baseFontSize` so the widest subtitle cue (wrapped into 1–2 lines)
 * spans `targetVisualWidth` (~86% of canvasWidth, leaving ~7% padding on left and right).
 */
export function computeTunedSubtitleFontSize({
	baseFontSize,
	canvasSize,
	targetVisualWidth,
	measuredMaxVisualWidth,
	texts,
	paddingX = 24,
	backgroundEnabled = false,
}: {
	baseFontSize: number;
	canvasSize: { width: number; height: number };
	targetVisualWidth: number;
	measuredMaxVisualWidth?: number;
	texts: string[];
	paddingX?: number;
	backgroundEnabled?: boolean;
}): number {
	const isVertical = canvasSize.height > canvasSize.width;
	const minFontSize = isVertical ? 2.2 : 3.0;
	const maxFontSize = isVertical ? 3.5 : 4.8;

	if (measuredMaxVisualWidth && measuredMaxVisualWidth > 0) {
		const ratio = targetVisualWidth / measuredMaxVisualWidth;
		const tuned = Math.round(baseFontSize * ratio * 10) / 10;
		return Math.max(minFontSize, Math.min(maxFontSize, tuned));
	}

	const scaledPx = baseFontSize * (canvasSize.height / 90);
	const bgHorizPad = backgroundEnabled
		? 2 * paddingX * (baseFontSize / 15) + 24
		: 16;
	let maxEstVisualWidth = 0;
	for (const rawText of texts) {
		const hasCjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
			rawText,
		);
		const charPx = hasCjk ? scaledPx * 0.96 : scaledPx * 0.54;
		const shouldWrapTwoLines = hasCjk
			? rawText.length >= 8
			: rawText.length >= 18 && rawText.split(/\s+/).length >= 4;
		const wrapped = shouldWrapTwoLines
			? (balanceTwoLineSubtitle({
					text: rawText,
					maxWidth: 10000,
					measure: (val) => val.length * charPx,
				}) ?? rawText)
			: rawText;
		const longestLineChars = Math.max(
			...wrapped.split("\n").map((line) => line.trim().length),
			1,
		);
		maxEstVisualWidth = Math.max(
			maxEstVisualWidth,
			longestLineChars * charPx + bgHorizPad,
		);
	}
	if (maxEstVisualWidth > 0) {
		const ratio = targetVisualWidth / maxEstVisualWidth;
		const tuned = Math.round(baseFontSize * ratio * 10) / 10;
		return Math.max(minFontSize, Math.min(maxFontSize, tuned));
	}
	return baseFontSize;
}

export function resolveSubtitleStyleOverrides({
	lookId,
	fontFamilyOverride,
}: {
	lookId?: string;
	fontFamilyOverride?: string | null;
}): SubtitleStyleOverrides {
	const preset = resolveArtisticSubtitlePreset(lookId);
	const fontFamily = fontFamilyOverride?.trim() || preset.defaultFontFamily;
	return {
		...preset.style,
		fontFamily,
	};
}

export type TimedVoSubtitleSegment = {
	text: string;
	startTime: number;
	duration: number;
};

// Natural English clause / phrase starter words where a subtitle split reads cleanly BEFORE this word.
const LATIN_BREAK_BEFORE_WORDS = new Set([
	"and",
	"or",
	"but",
	"so",
	"because",
	"when",
	"while",
	"if",
	"unless",
	"until",
	"before",
	"after",
	"that",
	"which",
	"who",
	"where",
	"to",
	"for",
	"from",
	"with",
	"without",
	"into",
	"onto",
	"upon",
	"by",
	"on",
	"in",
	"at",
	"about",
	"through",
	"across",
	"based",
	"saving",
	"making",
	"giving",
	"turning",
	"helping",
	"is",
	"are",
	"was",
	"were",
	"you",
]);

// Words that bind tightly to the NEXT word — never end a subtitle chunk on one of these.
const LATIN_NO_BREAK_AFTER_WORDS = new Set([
	"a",
	"an",
	"the",
	"your",
	"my",
	"our",
	"their",
	"his",
	"her",
	"its",
	"this",
	"that",
	"these",
	"those",
	"every",
	"each",
	"some",
	"any",
	"no",
	"both",
	"of",
	"to",
	"for",
	"in",
	"on",
	"at",
	"by",
	"with",
	"from",
	"into",
	"onto",
	"about",
	"through",
	"between",
	"under",
	"over",
	"i",
	"you",
	"he",
	"she",
	"it",
	"we",
	"they",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"will",
	"would",
	"can",
	"could",
	"should",
	"must",
	"do",
	"does",
	"did",
	"have",
	"has",
	"had",
	"then",
	"incredibly",
	"currently",
	"really",
	"very",
	"so",
	"too",
	"quite",
	"extremely",
	"repetitive",
	"endless",
	"personal",
	"key",
]);

// Two-word collocations that should stay together rather than splitting in the middle.
const LATIN_TIGHT_BIGRAMS = new Set([
	"hand over",
	"break free",
	"based on",
	"find it",
	"want to",
	"need to",
	"have to",
	"try using",
	"scro director",
]);

function cleanLinearWord(word: string): string {
	return word.toLowerCase().replace(/^[^a-z0-9']+|[,.!?;:—–"')\]]+$/g, "");
}

function splitLatinWordsAtBestPhraseBoundary(
	words: string[],
	maxWords: number,
	maxChars: number,
): string[] {
	const full = words.join(" ");
	if (words.length <= maxWords && full.length <= maxChars) {
		return [full];
	}

	const idealRatio = Math.min(0.55, maxChars / Math.max(full.length, 1));
	const idealIdx = Math.max(1, Math.min(words.length - 2, Math.round(words.length * idealRatio) - 1));
	let bestSplitAfter = -1;
	let bestScore = Number.NEGATIVE_INFINITY;

	for (let i = 1; i < words.length - 1; i++) {
		const leftWords = words.slice(0, i + 1);
		const rightWords = words.slice(i + 1);
		const leftText = leftWords.join(" ");
		if (leftWords.length > maxWords + 1 || leftText.length > maxChars + 6) continue;
		if (leftWords.length < 2 || rightWords.length < 2) continue;

		const prevWord = cleanLinearWord(words[i]);
		const nextWord = cleanLinearWord(words[i + 1]);
		const bigram = `${prevWord} ${nextWord}`;

		let score = 0;
		// Distance from ideal split point
		score -= Math.abs(i - idealIdx) * 3.5;
		if (leftWords.length <= maxWords && leftText.length <= maxChars) {
			score += 10;
		} else {
			score -= 15;
		}
		// Prefer breaking before a conjunction / preposition / clause starter
		if (LATIN_BREAK_BEFORE_WORDS.has(nextWord)) {
			score += 18;
		}
		// Strongly penalize breaking after determiners, prepositions, auxiliaries, or modifiers
		if (LATIN_NO_BREAK_AFTER_WORDS.has(prevWord)) {
			score -= 40;
		}
		// Strongly penalize breaking inside tight two-word collocations
		if (LATIN_TIGHT_BIGRAMS.has(bigram)) {
			score -= 35;
		}

		if (score > bestScore) {
			bestScore = score;
			bestSplitAfter = i;
		}
	}

	if (bestSplitAfter < 0) {
		bestSplitAfter = Math.min(maxWords - 1, Math.floor(words.length / 2) - 1);
	}

	const left = words.slice(0, bestSplitAfter + 1);
	const right = words.slice(bestSplitAfter + 1);
	return [
		...splitLatinWordsAtBestPhraseBoundary(left, maxWords, maxChars),
		...splitLatinWordsAtBestPhraseBoundary(right, maxWords, maxChars),
	];
}

function splitLongClauseIntoChunks(
	clause: string,
	maxLatinWords = 7,
	maxLatinChars = 36,
	maxCjkChars = 13,
): string[] {
	const hasCjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(clause);
	if (hasCjk) {
		if (clause.length <= maxCjkChars) return [clause];
		const targetChunkSize = Math.max(8, maxCjkChars - 2);
		const tokens = tokenizeMixedSubtitleLine(clause);
		const parts = Math.max(2, Math.ceil(clause.length / targetChunkSize));
		const targetLen = Math.ceil(clause.length / parts);
		const minLen = Math.max(5, Math.floor(targetLen * 0.6));
		const chunks: string[] = [];
		let current = "";
		for (const tok of tokens) {
			if (!current && /^\s+$/.test(tok)) continue;
			if (
				current.length + tok.length > targetLen &&
				current.trim().length >= minLen &&
				chunks.length < parts - 1
			) {
				chunks.push(current.trim());
				current = /^\s+$/.test(tok) ? "" : tok;
			} else {
				current += tok;
			}
		}
		if (current.trim()) chunks.push(current.trim());
		return chunks;
	}

	// Allow breaking around em/en-dashes so compound tokens like "generation—saving" split cleanly
	const dashParts = clause
		.split(/\s*[—–]+\s*/u)
		.map((part) => part.trim())
		.filter(Boolean);
	if (dashParts.length > 1) {
		return dashParts.flatMap((part) =>
			splitLongClauseIntoChunks(part, maxLatinWords, maxLatinChars, maxCjkChars),
		);
	}

	const normalizedClause = clause.replace(/([A-Za-z0-9])([—–])([A-Za-z0-9])/g, "$1$2 $3");
	const words = normalizedClause.split(/\s+/).filter(Boolean);
	return splitLatinWordsAtBestPhraseBoundary(words, maxLatinWords, maxLatinChars);
}

/**
 * Splits a clip's spoken VO line into natural timed subtitle segments:
 * - For 9:16 Vertical Reels / 1:1 (`isLandscape = false`): splits into shorter, punchy semantic
 *   phrases (~4–7 English words / ~22–36 chars, or ~8–13 CJK chars) so each subtitle renders BIGGER.
 * - For 16:9 Landscape (`isLandscape = true`): allows longer subtitle clauses (~8–12 English words
 *   / ~44–62 chars, or ~15–22 CJK chars) to take advantage of the wide horizontal frame.
 */
export function splitVoIntoSubtitleSegments({
	line,
	startTime,
	duration,
	maxClauseChars,
	isLandscape,
	canvasSize,
	cues,
}: {
	line: string;
	startTime: number;
	duration: number;
	maxClauseChars?: number;
	isLandscape?: boolean;
	canvasSize?: { width: number; height: number };
	cues?: string[];
}): TimedVoSubtitleSegment[] {
	const cleaned = line.trim().replace(/\s+/g, " ");
	if (!cleaned || duration <= 0) return [];

	const landscape =
		isLandscape ??
		(canvasSize ? canvasSize.width > canvasSize.height : false);
	const hasCjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(cleaned);
	const maxLatinWords = landscape ? 12 : 7;
	const maxLatinChars = maxClauseChars ?? (landscape ? 60 : 36);
	const maxCjkChars = maxClauseChars ?? (landscape ? 22 : 13);
	const mergeMaxChars = maxClauseChars ?? (hasCjk ? (landscape ? 20 : 10) : landscape ? 52 : 26);

	const initialClauses =
		cues && cues.length > 0
			? cues
					.map((c) => c.trim())
					.filter(Boolean)
			: cleaned
					// Split at major CJK/Latin punctuation and English sentence-ending periods (without splitting "Scro.io")
					.split(/(?:(?<=[。！？!?；;，,])\s*|(?<=\b[A-Za-z0-9'")\]]{2,}\.)\s+)/u)
					.map((part) => part.replace(/[，,。；;]+$/u, "").replace(/\.$/u, "").trim())
					.filter(Boolean);

	const rawClauses = initialClauses.flatMap((clause) =>
		splitLongClauseIntoChunks(clause, maxLatinWords, maxLatinChars, maxCjkChars),
	);

	if (rawClauses.length <= 1) {
		return [
			{
				text: (rawClauses[0] ?? cleaned).replace(/[，,。；;]+$/u, ""),
				startTime,
				duration,
			},
		];
	}

	// Merge only tiny adjacent clauses so subtitles don't flash too fast, while keeping 9:16 cues short and large
	const merged: string[] = [];
	for (const clause of rawClauses) {
		const prev = merged[merged.length - 1];
		const sep = " ";
		const combinedWords = prev
			? `${prev} ${clause}`.trim().split(/\s+/).length
			: 0;
		const canMergeWords = hasCjk || combinedWords <= (landscape ? 11 : 6);
		if (
			prev &&
			canMergeWords &&
			prev.length + sep.length + clause.length <= mergeMaxChars &&
			!/[！？!?]$/.test(prev)
		) {
			merged[merged.length - 1] = `${prev}${sep}${clause}`;
		} else {
			merged.push(clause);
		}
	}

	if (merged.length === 1) {
		return [{ text: merged[0], startTime, duration }];
	}

	const weights = merged.map((seg) => Math.max(2, seg.length));
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);
	let cursor = startTime;

	return merged.map((text, idx) => {
		const isLast = idx === merged.length - 1;
		const segDuration = isLast
			? Math.max(0.2, startTime + duration - cursor)
			: Math.max(0.2, (duration * weights[idx]) / totalWeight);
		const segStart = cursor;
		cursor += segDuration;
		return {
			text,
			startTime: segStart,
			duration: segDuration,
		};
	});
}
