// Same-window bus when Scro mounts this editor directly. Iframe keeps postMessage.

type Handler = (message: unknown) => void;

export type ScroOpenCutHost = {
	postToEditor: (message: unknown) => void;
	postToScro: (message: unknown) => void;
	subscribeEditor: (handler: Handler) => () => void;
	subscribeScro: (handler: Handler) => () => void;
};

declare global {
	interface Window {
		__SCRO_OPENCUT_HOST__?: ScroOpenCutHost;
	}
}

export function scroHost(): ScroOpenCutHost | null {
	if (typeof window === "undefined") return null;
	return window.__SCRO_OPENCUT_HOST__ ?? null;
}

// True inside Scro's inline host, or the legacy ?embed=1 iframe.
export function isScroEmbed(embedParam?: string | null) {
	if (typeof window !== "undefined" && window.__SCRO_OPENCUT_HOST__) return true;
	if (embedParam === "1") return true;
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get("embed") === "1";
}

export function listenFromScro(
	handler: (data: unknown, origin: string) => void,
	allowedOrigins?: Set<string>,
) {
	const host = scroHost();
	if (host) {
		return host.subscribeEditor((message) => handler(message, window.location.origin));
	}
	const onMessage = (event: MessageEvent) => {
		if (allowedOrigins && !allowedOrigins.has(event.origin)) return;
		handler(event.data, event.origin);
	};
	window.addEventListener("message", onMessage);
	return () => window.removeEventListener("message", onMessage);
}

export function sendToScro(message: unknown, origin: string) {
	const host = scroHost();
	if (host) {
		host.postToScro(message);
		return;
	}
	window.parent.postMessage(message, origin);
}
