import { isScroEmbed, scroHost } from "@/embed/scro-transport";

const PARENT_ORIGINS = new Set([
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"https://www.scro.io",
	"https://scro.io",
]);

export { isScroEmbed };

// Parent frame that loaded this editor, or this window when Scro mounts it inline.
export function scroEmbedParentOrigin(): string | null {
	if (scroHost()) return window.location.origin;
	if (!document.referrer) return null;
	try {
		const origin = new URL(document.referrer).origin;
		return PARENT_ORIGINS.has(origin) ? origin : null;
	} catch {
		return null;
	}
}
