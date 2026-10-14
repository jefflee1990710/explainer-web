import type { LibrarySound } from "@/service/sound-effect/library";
import { soundEffectPageBounds } from "@/service/sound-effect/library";

export const FREESOUND_SEARCH_URL = "https://freesound.org/apiv2/search/";

const SEARCH_FIELDS = "id,name,tags,username,license,duration,previews,description";

/** CC0 and CC BY can be used in a commercial video. Noncommercial stays out. */
export function freesoundCommercialFilter(commercialOnly: boolean): string | undefined {
	if (!commercialOnly) return undefined;
	return 'license:("Creative Commons 0" OR Attribution)';
}

export function freesoundBrowse({ query }: { query: string }): { query: string; sort: string } {
	const trimmed = query.trim();
	if (!trimmed) return { query: "", sort: "downloads_desc" };
	return { query: trimmed, sort: "score" };
}

function licenseLabel(license: string) {
	const value = license.toLowerCase();
	if (
		value.includes("publicdomain") ||
		value.includes("creative commons 0") ||
		value.includes("/zero/")
	) {
		return "CC0";
	}
	if (value.includes("noncommercial") || value.includes("by-nc")) return "CC BY-NC";
	if (value.includes("attribution") || value.includes("/by/")) return "CC BY";
	return license;
}

function previewMp3(previews: unknown): string | null {
	if (!previews || typeof previews !== "object") return null;
	const record = previews as Record<string, unknown>;
	const hq = record["preview-hq-mp3"];
	const lq = record["preview-lq-mp3"];
	if (typeof hq === "string" && hq.length > 0) return hq;
	if (typeof lq === "string" && lq.length > 0) return lq;
	return null;
}

function oneLine(value: string) {
	return value
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+([.,;:!?])/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
}

/** Turn one Freesound search hit into the editor row. Skip sounds with no preview. */
export function freesoundHitToLibrarySound(hit: unknown): LibrarySound | null {
	if (!hit || typeof hit !== "object") return null;
	const record = hit as Record<string, unknown>;
	const id = record.id;
	const name = record.name;
	const previewUrl = previewMp3(record.previews);
	if (typeof id !== "number" || !Number.isInteger(id)) return null;
	if (typeof name !== "string" || name.trim().length === 0) return null;
	if (!previewUrl) return null;

	const username = typeof record.username === "string" ? record.username : "Freesound";
	const license = typeof record.license === "string" ? record.license : "";
	const rawDescription = typeof record.description === "string" ? oneLine(record.description) : "";
	const snippet = rawDescription.slice(0, 140);
	const credit = `${username} · ${licenseLabel(license)}`;

	return {
		id: `fs-${id}`,
		name: name.trim(),
		description: snippet ? `${credit} · ${snippet}` : credit,
		previewUrl,
		duration: typeof record.duration === "number" && Number.isFinite(record.duration) ? record.duration : 0,
		username,
		tags: Array.isArray(record.tags)
			? record.tags.filter((tag): tag is string => typeof tag === "string")
			: [],
		license,
	};
}

export function parseFreesoundSearchPage(body: unknown): {
	count: number;
	hasNext: boolean;
	results: LibrarySound[];
} | null {
	if (!body || typeof body !== "object") return null;
	const record = body as Record<string, unknown>;
	if (!Array.isArray(record.results) || typeof record.count !== "number") return null;
	return {
		count: record.count,
		hasNext: typeof record.next === "string" && record.next.length > 0,
		results: record.results.flatMap((hit) => {
			const sound = freesoundHitToLibrarySound(hit);
			return sound ? [sound] : [];
		}),
	};
}

function freesoundApiKey() {
	const apiKey = process.env.FREESOUND_CLIENT_SECRET?.trim() ?? "";
	if (!apiKey) throw new Error("Freesound credentials are not configured");
	return apiKey;
}

/** Search Freesound. The API key stays on the server (Token auth). */
export async function searchFreesoundSounds(input: {
	page?: number;
	query?: string;
	commercialOnly?: boolean;
}) {
	const { page, pageSize } = soundEffectPageBounds(input.page ?? 1);
	const browse = freesoundBrowse({ query: input.query ?? "" });
	const params = new URLSearchParams({
		query: browse.query,
		sort: browse.sort,
		fields: SEARCH_FIELDS,
		page: String(page),
		page_size: String(pageSize),
	});
	const filter = freesoundCommercialFilter(input.commercialOnly !== false);
	if (filter) params.set("filter", filter);

	const response = await fetch(`${FREESOUND_SEARCH_URL}?${params.toString()}`, {
		headers: { Authorization: `Token ${freesoundApiKey()}` },
		cache: "no-store",
	});
	const body: unknown = await response.json().catch(() => null);
	const parsed = parseFreesoundSearchPage(body);
	if (!response.ok || !parsed) {
		throw new Error("Freesound search failed");
	}
	return { page, pageSize, ...parsed };
}
