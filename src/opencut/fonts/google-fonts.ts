import type { FontAtlas } from "@/opencut/fonts/types";
import { SYSTEM_FONTS } from "@/opencut/fonts/system-fonts";

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2";
const FONT_ATLAS_PATH = "/fonts/font-atlas.json";
const FONT_CHUNK_PATH_PREFIX = "/fonts/font-chunk-";

const fullLoaded = new Set<string>();

let cachedAtlas: FontAtlas | null = null;
let atlasFetchPromise: Promise<FontAtlas | null> | null = null;

function encodeGoogleFontsFamily(family: string): string {
	return family.replace(/ /g, "+");
}

export function getCachedFontAtlas(): FontAtlas | null {
	return cachedAtlas;
}

export function clearFontAtlasCache(): void {
	cachedAtlas = null;
	atlasFetchPromise = null;
	fullLoaded.clear();
}

export function loadFontAtlas(): Promise<FontAtlas | null> {
	if (cachedAtlas) return Promise.resolve(cachedAtlas);
	if (atlasFetchPromise) return atlasFetchPromise;

	atlasFetchPromise = fetch(FONT_ATLAS_PATH)
		.then(async (response) => {
			if (!response.ok) return null;
			const data: FontAtlas = await response.json();
			cachedAtlas = data;
			preloadChunkImages({ atlas: data });
			return data;
		})
		.catch(() => null);

	return atlasFetchPromise;
}

function preloadChunkImages({ atlas }: { atlas: FontAtlas }): void {
	const maxChunk = Math.max(
		...Object.values(atlas.fonts).map((entry) => entry.ch),
	);
	for (let i = 0; i <= maxChunk; i++) {
		// hint browser to preload chunk images without blocking
		const img = new Image();
		img.src = `${FONT_CHUNK_PATH_PREFIX}${i}.avif`;
	}
}

const GOOGLE_FONT_LOAD_TIMEOUT_MS = 3000;

/**
 * Display/artistic Google Fonts that only publish weight 400 (or specific weights).
 * Requesting unsupported weights (like 700 on Anton or Dela Gothic One) causes Google Fonts CSS2 API to return HTTP 400.
 */
const KNOWN_GOOGLE_FONT_WEIGHTS: Record<string, number[]> = {
	Anton: [400],
	"Bebas Neue": [400],
	"Dela Gothic One": [400],
	"Mochiy Pop One": [400],
	DotGothic16: [400],
	Pacifico: [400],
	"Permanent Marker": [400],
	"RocknRoll One": [400],
	"Reggae One": [400],
	"Rampart One": [400],
	Yomogi: [400],
	"Kosugi Maru": [400],
	"Potta One": [400],
	"Hachi Maru Pop": [400],
	Stick: [400],
	Chokokutai: [400],
	"ZCOOL KuaiLe": [400],
	"ZCOOL QingKe HuangYou": [400],
	"ZCOOL XiaoWei": [400],
	"Ma Shan Zheng": [400],
	"Noto Sans TC": [400, 700, 900],
	"Noto Serif TC": [400, 700, 900],
	"Zen Maru Gothic": [400, 700, 900],
	"LXGW WenKai TC": [400, 700],
	"M PLUS Rounded 1c": [400, 700, 800],
	Montserrat: [400, 700, 900],
	Inter: [400, 700, 900],
	Poppins: [400, 700, 900],
	Oswald: [400, 700],
	Fredoka: [400, 600, 700],
	"Chakra Petch": [400, 700],
	Caveat: [400, 700],
	"Playfair Display": [400, 700, 900],
	Lora: [400, 700],
	"Source Code Pro": [400, 700],
};

export function splitFontStack(family: string): string[] {
	return family
		.split(",")
		.map((part) => part.trim().replace(/^["']|["']$/g, "").trim())
		.filter(Boolean);
}

export function withFontLoadTimeout<T>(
	promise: Promise<T>,
	timeoutMs = GOOGLE_FONT_LOAD_TIMEOUT_MS,
): Promise<T | undefined> {
	return new Promise<T | undefined>((resolve) => {
		const timer = setTimeout(() => resolve(undefined), timeoutMs);
		promise
			.then((value) => {
				clearTimeout(timer);
				resolve(value);
			})
			.catch(() => {
				clearTimeout(timer);
				resolve(undefined);
			});
	});
}

async function loadSingleGoogleFont({
	family,
	weights,
}: {
	family: string;
	weights?: number[];
}): Promise<void> {
	if (SYSTEM_FONTS.has(family) || fullLoaded.has(family)) return;

	const resolvedWeights = KNOWN_GOOGLE_FONT_WEIGHTS[family] ?? weights ?? [400, 700];
	const url = `${GOOGLE_FONTS_CSS}?family=${encodeGoogleFontsFamily(family)}:wght@${resolvedWeights.join(";")}&display=swap`;
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = url;
	document.head.appendChild(link);
	await withFontLoadTimeout(
		new Promise<void>((resolve) => {
			link.addEventListener("load", () => resolve(), { once: true });
			link.addEventListener("error", () => resolve(), { once: true });
		}),
	);
	await withFontLoadTimeout(
		Promise.all(
			resolvedWeights.map((weight) =>
				document.fonts.load(`${weight} 16px "${family.replace(/"/g, '\\"')}"`),
			),
		),
	);
	fullLoaded.add(family);
}

export async function loadFullFont({
	family,
	weights = [400, 700],
}: {
	family: string;
	weights?: number[];
}): Promise<void> {
	const parts = splitFontStack(family);
	if (parts.length === 0) return;
	await Promise.all(
		parts.map((singleFamily) =>
			loadSingleGoogleFont({ family: singleFamily, weights }),
		),
	);
}

export async function loadFonts({
	families,
}: {
	families: string[];
}): Promise<void> {
	const singleFamilies = [
		...new Set(families.flatMap((family) => splitFontStack(family))),
	].filter((family) => !SYSTEM_FONTS.has(family));
	await Promise.all(singleFamilies.map((family) => loadSingleGoogleFont({ family })));
}
