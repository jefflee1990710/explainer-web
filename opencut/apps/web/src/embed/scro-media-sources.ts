// Which imported file belongs to which timeline media id, plus URLs already placed.

const SOURCE_KEY = "scro-media-sources:";
const SEEN_KEY = "scro-imported:";

function readJson(key: string): Record<string, string> {
	try {
		const raw = localStorage.getItem(key);
		const parsed = raw ? (JSON.parse(raw) as unknown) : {};
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
		const sources: Record<string, string> = {};
		for (const [id, url] of Object.entries(parsed)) {
			if (typeof url === "string" && url) sources[id] = url;
		}
		return sources;
	} catch {
		return {};
	}
}

export function rememberClipSource(videoId: string, mediaId: string, url: string) {
	const sources = readJson(SOURCE_KEY + videoId);
	sources[mediaId] = url;
	try {
		localStorage.setItem(SOURCE_KEY + videoId, JSON.stringify(sources));
	} catch {
		// Private mode can block storage; the in-memory editor still has the clip.
	}
}

export function readClipSources(videoId: string) {
	return readJson(SOURCE_KEY + videoId);
}

export function readSeen(videoId: string) {
	try {
		const raw = localStorage.getItem(SEEN_KEY + videoId);
		const parsed = raw ? (JSON.parse(raw) as unknown) : [];
		return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
	} catch {
		return new Set<string>();
	}
}

export function writeSeen(videoId: string, seen: Set<string>) {
	try {
		localStorage.setItem(SEEN_KEY + videoId, JSON.stringify([...seen]));
	} catch {
		// Private mode can block storage; the clips are still on the timeline.
	}
}

export function armScroSync() {
	window.dispatchEvent(new Event("scro-sync-arm"));
}
