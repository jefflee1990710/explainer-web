const PARENT_ORIGINS = new Set([
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"https://www.scro.io",
	"https://scro.io",
]);

export function isScroEmbed() {
	return new URLSearchParams(window.location.search).get("embed") === "1";
}

// Parent frame that loaded this editor in embed mode.
export function scroEmbedParentOrigin(): string | null {
	if (!document.referrer) return null;
	try {
		const origin = new URL(document.referrer).origin;
		return PARENT_ORIGINS.has(origin) ? origin : null;
	} catch {
		return null;
	}
}
