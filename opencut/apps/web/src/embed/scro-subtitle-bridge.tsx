"use client";

import { useEffect } from "react";
import { isScroEmbed, scroEmbedParentOrigin } from "@/embed/scro-embed-parent";
import { setScroSubtitleCatalog, setScroSubtitleVideoId, type ScroSubtitleCatalog } from "@/embed/scro-subtitle-store";

function isCatalog(value: unknown): value is ScroSubtitleCatalog {
	if (!value || typeof value !== "object") return false;
	const catalog = value as ScroSubtitleCatalog;
	return Array.isArray(catalog.styles) && Array.isArray(catalog.lines) && !!catalog.ui;
}

// Asks the Scro parent for text styles and spoken lines.
export function ScroSubtitleBridge() {
	useEffect(() => {
		if (!isScroEmbed()) return;
		const origin = scroEmbedParentOrigin();
		if (!origin) return;

		const onMessage = (event: MessageEvent) => {
			if (event.origin !== origin) return;
			const data = event.data as { type?: string; catalog?: unknown; videoId?: string };
			if (data?.type !== "scro-subtitle-catalog" || !isCatalog(data.catalog)) return;
			setScroSubtitleCatalog(data.catalog);
			if (typeof data.videoId === "string") setScroSubtitleVideoId(data.videoId);
		};

		window.addEventListener("message", onMessage);
		window.parent.postMessage({ type: "scro-subtitle-request" }, origin);
		return () => window.removeEventListener("message", onMessage);
	}, []);

	return null;
}
