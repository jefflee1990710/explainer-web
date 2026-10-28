import type { SubtitleStyleOverrides } from "./types";

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
		/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}][，。！？；：、）】」』》”’,.!?;:)\]]*|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+|\s+/gu;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		tokens.push(match[0]);
	}
	return tokens;
}

export function wrapSubtitleTextWithMeasure({
	text,
	maxWidth,
	measure,
}: {
	text: string;
	maxWidth: number;
	measure: (value: string) => number;
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
		defaultFontFamily: "Oswald, Montserrat, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #dedcd6 0%, #cfccc4 100%)",
		sampleText: "Everyone is forcing\npersonal branding.",
		style: {
			fontFamily: "Oswald, Montserrat, Noto Sans TC",
			fontSize: 4.4,
			fontWeight: "bold",
			lineHeight: 1.44,
			color: "#FFFFFF",
			strokeColor: "#000000",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			shadowBlur: 0,
			background: {
				enabled: true,
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

function splitLongClauseIntoChunks(clause: string, maxLatinWords = 7, maxCjkChars = 18): string[] {
	const hasCjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(clause);
	if (hasCjk) {
		if (clause.length <= maxCjkChars) return [clause];
		const tokens = tokenizeMixedSubtitleLine(clause);
		const parts = Math.max(2, Math.ceil(clause.length / 15));
		const targetLen = Math.ceil(clause.length / parts);
		const chunks: string[] = [];
		let current = "";
		for (const tok of tokens) {
			if (!current && /^\s+$/.test(tok)) continue;
			if (current.length + tok.length > targetLen && current.trim().length >= 6 && chunks.length < parts - 1) {
				chunks.push(current.trim());
				current = /^\s+$/.test(tok) ? "" : tok;
			} else {
				current += tok;
			}
		}
		if (current.trim()) chunks.push(current.trim());
		return chunks;
	}

	const words = clause.split(/\s+/).filter(Boolean);
	if (words.length <= maxLatinWords) return [clause];
	const parts = Math.max(2, Math.ceil(words.length / 6));
	const wordsPerPart = Math.ceil(words.length / parts);
	const chunks: string[] = [];
	for (let i = 0; i < words.length; i += wordsPerPart) {
		chunks.push(words.slice(i, i + wordsPerPart).join(" "));
	}
	return chunks;
}

/**
 * Splits a clip's spoken VO line into natural timed subtitle segments when it contains
 * multiple clauses/sentences, keeping each cue concise (1–2 lines) and timed proportionally.
 */
export function splitVoIntoSubtitleSegments({
	line,
	startTime,
	duration,
	maxClauseChars = 18,
}: {
	line: string;
	startTime: number;
	duration: number;
	maxClauseChars?: number;
}): TimedVoSubtitleSegment[] {
	const cleaned = line.trim().replace(/\s+/g, " ");
	if (!cleaned || duration <= 0) return [];

	// Split at major CJK/Latin punctuation and English sentence-ending periods (without splitting "Scro.io")
	const rawClauses = cleaned
		.split(/(?:(?<=[。！？!?；;，,])\s*|(?<=\b[A-Za-z0-9'")\]]{2,}\.)\s+)/u)
		.map((part) => part.replace(/[，,。；;]+$/u, "").replace(/\.$/u, "").trim())
		.filter(Boolean)
		.flatMap((clause) => splitLongClauseIntoChunks(clause));

	if (rawClauses.length <= 1) {
		return [
			{
				text: (rawClauses[0] ?? cleaned).replace(/[，,。；;]+$/u, ""),
				startTime,
				duration,
			},
		];
	}

	// Merge very short adjacent clauses so subtitles don't flash too fast
	const merged: string[] = [];
	for (const clause of rawClauses) {
		const prev = merged[merged.length - 1];
		if (prev && prev.length + 1 + clause.length <= maxClauseChars) {
			merged[merged.length - 1] = `${prev} ${clause}`;
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
