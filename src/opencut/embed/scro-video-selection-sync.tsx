"use client";

import { useEffect } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { setScroVideoSelection, useScroVideos } from "@/opencut/embed/scro-video-store";
import { useElementSelection } from "@/opencut/timeline/hooks/element/use-element-selection";

/** Keep Assets/Properties selection aligned with the timeline selection. */
export function ScroVideoSelectionSync() {
	const store = useScroVideos();
	const { selectedElements } = useElementSelection();
	const editor = useEditor();
	useEditor((e) => e.scenes.getActiveSceneOrNull());

	useEffect(() => {
		if (!store) return;
		if (selectedElements.length !== 1) return;
		const located = editor.timeline.getElementsWithTracks({
			elements: selectedElements,
		})[0];
		const element = located?.element;
		if (
			!element ||
			(element.type !== "video" && element.type !== "image") ||
			element.scroClipNumber == null
		) {
			return;
		}
		if (store.selectedClipNumber !== element.scroClipNumber) {
			setScroVideoSelection(element.scroClipNumber);
		}
	}, [editor, selectedElements, store]);

	return null;
}
