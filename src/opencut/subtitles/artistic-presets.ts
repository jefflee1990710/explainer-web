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
		sampleText: "爆款金句 POP",
		style: {
			fontFamily: "Anton, Dela Gothic One, Noto Sans TC",
			fontSize: 8.5,
			fontWeight: "bold",
			color: "#FFE600",
			strokeColor: "#000000",
			strokeWidth: 3.5,
			shadowColor: "#000000",
			shadowOffsetX: 2.5,
			shadowOffsetY: 3.5,
			shadowBlur: 0,
			background: { enabled: false, color: "#000000" },
		},
	},
	clean: {
		id: "clean",
		defaultFontFamily: "Montserrat, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
		sampleText: "清晰重點 Clean",
		style: {
			fontFamily: "Montserrat, Noto Sans TC",
			fontSize: 7.5,
			fontWeight: "bold",
			color: "#FFFFFF",
			strokeColor: "#000000",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			shadowBlur: 0,
			background: {
				enabled: true,
				color: "#12141C",
				cornerRadius: 35,
				paddingX: 28,
				paddingY: 18,
			},
		},
	},
	handwritten: {
		id: "handwritten",
		defaultFontFamily: "Caveat, LXGW WenKai TC, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
		sampleText: "手寫筆記 Note",
		style: {
			fontFamily: "Caveat, LXGW WenKai TC, Noto Sans TC",
			fontSize: 8,
			fontWeight: "bold",
			color: "#12141C",
			strokeColor: "#000000",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 2,
			shadowOffsetY: 3,
			shadowBlur: 6,
			background: {
				enabled: true,
				color: "#FFFDF7",
				cornerRadius: 18,
				paddingX: 30,
				paddingY: 18,
			},
		},
	},
	neon: {
		id: "neon",
		defaultFontFamily: "Chakra Petch, Zen Maru Gothic, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)",
		sampleText: "霓虹發光 Neon",
		style: {
			fontFamily: "Chakra Petch, Zen Maru Gothic, Noto Sans TC",
			fontSize: 8,
			fontWeight: "bold",
			color: "#00F5FF",
			strokeColor: "#081B33",
			strokeWidth: 2,
			shadowColor: "#FF00A0",
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			shadowBlur: 14,
			background: { enabled: false, color: "#000000" },
		},
	},
	comic: {
		id: "comic",
		defaultFontFamily: "Oswald, Reggae One, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
		sampleText: "熱血漫畫 Comic!",
		style: {
			fontFamily: "Oswald, Reggae One, Noto Sans TC",
			fontSize: 8.5,
			fontWeight: "bold",
			fontStyle: "italic",
			color: "#FFEB3B",
			strokeColor: "#111111",
			strokeWidth: 3.5,
			shadowColor: "#FF3B2F",
			shadowOffsetX: 3,
			shadowOffsetY: 4,
			shadowBlur: 0,
			background: { enabled: false, color: "#000000" },
		},
	},
	chalk: {
		id: "chalk",
		defaultFontFamily: "Permanent Marker, Yomogi, LXGW WenKai TC, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #14532d 0%, #064e3b 100%)",
		sampleText: "黑板粉筆 Chalk",
		style: {
			fontFamily: "Permanent Marker, Yomogi, LXGW WenKai TC, Noto Sans TC",
			fontSize: 8,
			fontWeight: "bold",
			color: "#F8FAFC",
			strokeColor: "#0F172A",
			strokeWidth: 2,
			shadowColor: "#000000",
			shadowOffsetX: 1,
			shadowOffsetY: 2,
			shadowBlur: 4,
			background: { enabled: false, color: "#000000" },
		},
	},
	gold: {
		id: "gold",
		defaultFontFamily: "Playfair Display, Noto Serif TC",
		cardBg: "linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)",
		sampleText: "黑金質感 Gold",
		style: {
			fontFamily: "Playfair Display, Noto Serif TC",
			fontSize: 8,
			fontWeight: "bold",
			color: "#FFD54F",
			strokeColor: "#2A1B00",
			strokeWidth: 3,
			shadowColor: "#000000",
			shadowOffsetX: 2,
			shadowOffsetY: 3,
			shadowBlur: 6,
			background: { enabled: false, color: "#000000" },
		},
	},
	typewriter: {
		id: "typewriter",
		defaultFontFamily: "Source Code Pro, Noto Serif TC",
		cardBg: "linear-gradient(135deg, #292524 0%, #1c1917 100%)",
		sampleText: "復古打字 Type",
		style: {
			fontFamily: "Source Code Pro, Noto Serif TC",
			fontSize: 7,
			fontWeight: "bold",
			color: "#1C1917",
			strokeColor: "#000000",
			strokeWidth: 0,
			shadowColor: "#000000",
			shadowOffsetX: 2,
			shadowOffsetY: 3,
			shadowBlur: 0,
			background: {
				enabled: true,
				color: "#F5F0E1",
				cornerRadius: 12,
				paddingX: 26,
				paddingY: 16,
			},
		},
	},
	graffiti: {
		id: "graffiti",
		defaultFontFamily: "Bebas Neue, RocknRoll One, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #27272a 0%, #18181b 100%)",
		sampleText: "街頭塗鴉 Vibe",
		style: {
			fontFamily: "Bebas Neue, RocknRoll One, Noto Sans TC",
			fontSize: 8.5,
			fontWeight: "bold",
			color: "#FF2E93",
			strokeColor: "#FFFFFF",
			strokeWidth: 3.5,
			shadowColor: "#12141C",
			shadowOffsetX: 3,
			shadowOffsetY: 4,
			shadowBlur: 0,
			background: { enabled: false, color: "#000000" },
		},
	},
	sticker: {
		id: "sticker",
		defaultFontFamily: "Fredoka, Mochiy Pop One, Zen Maru Gothic, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
		sampleText: "立體貼紙 Cute",
		style: {
			fontFamily: "Fredoka, Mochiy Pop One, Zen Maru Gothic, Noto Sans TC",
			fontSize: 8,
			fontWeight: "bold",
			color: "#FF2E2E",
			strokeColor: "#FFFFFF",
			strokeWidth: 4.5,
			shadowColor: "#12141C",
			shadowOffsetX: 2,
			shadowOffsetY: 4,
			shadowBlur: 5,
			background: { enabled: false, color: "#000000" },
		},
	},
	glitch: {
		id: "glitch",
		defaultFontFamily: "Chakra Petch, DotGothic16, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
		sampleText: "數碼故障 AI",
		style: {
			fontFamily: "Chakra Petch, DotGothic16, Noto Sans TC",
			fontSize: 8,
			fontWeight: "bold",
			color: "#FFFFFF",
			strokeColor: "#00F0FF",
			strokeWidth: 2,
			shadowColor: "#FF0055",
			shadowOffsetX: 3,
			shadowOffsetY: 2,
			shadowBlur: 0,
			background: { enabled: false, color: "#000000" },
		},
	},
	brush: {
		id: "brush",
		defaultFontFamily: "Caveat, LXGW WenKai TC, Noto Serif TC",
		cardBg: "linear-gradient(135deg, #292524 0%, #1c1917 100%)",
		sampleText: "書法勁筆 Ink",
		style: {
			fontFamily: "Caveat, LXGW WenKai TC, Noto Serif TC",
			fontSize: 8.5,
			fontWeight: "bold",
			color: "#FFFFFF",
			strokeColor: "#111111",
			strokeWidth: 3.5,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: 3,
			shadowBlur: 8,
			background: { enabled: false, color: "#000000" },
		},
	},
	outline: {
		id: "outline",
		defaultFontFamily: "Anton, Rampart One, Dela Gothic One, Noto Sans TC",
		cardBg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
		sampleText: "立體空心 3D",
		style: {
			fontFamily: "Anton, Rampart One, Dela Gothic One, Noto Sans TC",
			fontSize: 8.5,
			fontWeight: "bold",
			color: "#FFFFFF",
			strokeColor: "#1E3A8A",
			strokeWidth: 4,
			shadowColor: "#C6F24B",
			shadowOffsetX: 3,
			shadowOffsetY: 3,
			shadowBlur: 0,
			background: { enabled: false, color: "#000000" },
		},
	},
};

export function resolveArtisticSubtitlePreset(lookId?: string): ArtisticSubtitlePreset {
	if (lookId && lookId in ARTISTIC_SUBTITLE_PRESETS) {
		return ARTISTIC_SUBTITLE_PRESETS[lookId];
	}
	return ARTISTIC_SUBTITLE_PRESETS.bold;
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

/**
 * Splits a clip's spoken VO line into natural timed subtitle segments when it contains
 * multiple clauses/sentences, keeping each cue concise and timed proportionally by character weight.
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

	// Split at major sentence/clause punctuation while keeping terminal ! and ?
	const rawClauses = cleaned
		.split(/(?<=[。！？!?；;，,])\s*/u)
		.map((part) => part.replace(/[，,。；;]+$/u, "").trim())
		.filter(Boolean);

	if (rawClauses.length <= 1) {
		return [{ text: cleaned.replace(/[，,。；;]+$/u, ""), startTime, duration }];
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
