"use client";

import { useEffect } from "react";
import { scroEmbedParentOrigin } from "@/opencut/embed/scro-embed-parent";
import { sendToScro } from "@/opencut/embed/scro-transport";
import { useScroVideos } from "@/opencut/embed/scro-video-store";

/**
 * Pushes Assets multi-select + focus clip to the Scro host toolbar.
 * Visual chrome lives on the host (`OpenCutScroToolbar`).
 */
export function ScroVideoToolbarBridge() {
	const store = useScroVideos();

	useEffect(() => {
		if (!store) return;
		const origin = scroEmbedParentOrigin() ?? window.location.origin;
		sendToScro(
			{
				type: "scro-selection-state",
				videoId: store.videoId,
				selectedClipNumber: store.selectedClipNumber,
				checkedClipNumbers: store.checkedClipNumbers,
			},
			origin,
		);
	}, [
		store?.videoId,
		store?.selectedClipNumber,
		store?.checkedClipNumbers,
		store,
	]);

	return null;
}
