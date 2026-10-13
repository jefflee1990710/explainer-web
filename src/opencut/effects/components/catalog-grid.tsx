"use client";

import { useCallback } from "react";
import { PanelView } from "@/opencut/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/opencut/components/editor/panels/assets/draggable-item";
import { CatalogThumb } from "@/opencut/effects/components/catalog-thumb";
import {
	effectsRegistry,
	EFFECT_TARGET_ELEMENT_TYPES,
	registerDefaultEffects,
} from "@/opencut/effects";
import type { EffectCategory, EffectDefinition } from "@/opencut/effects/types";
import type { EditorCore } from "@/opencut/core";
import { useEditor } from "@/opencut/editor/use-editor";
import { buildEffectElement } from "@/opencut/timeline/element-utils";
import { mediaTimeFromSeconds, mediaTimeToSeconds, type MediaTime } from "@/opencut/wasm";

export function EffectCatalog({
	category,
	title,
}: {
	category: EffectCategory;
	title: string;
}) {
	registerDefaultEffects();
	const effects = effectsRegistry
		.getAll()
		.filter((effect) => (effect.category ?? "effect") === category);

	return (
		<PanelView title={title}>
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
			>
				{effects.map((effect) => (
					<CatalogItem key={effect.type} effect={effect} category={category} />
				))}
			</div>
		</PanelView>
	);
}

function CatalogItem({
	effect,
	category,
}: {
	effect: EffectDefinition;
	category: EffectCategory;
}) {
	const editor = useEditor();

	const handleAddToTimeline = useCallback(() => {
		const startTime =
			category === "transition"
				? transitionStartTime({ editor })
				: editor.playback.getCurrentTime();
		const element = buildEffectElement({
			effectType: effect.type,
			startTime,
		});
		editor.timeline.insertElement({
			placement: { mode: "auto", trackType: "effect" },
			element,
		});
	}, [category, editor, effect.type]);

	return (
		<DraggableItem
			name={effect.name}
			preview={<CatalogThumb category={category} type={effect.type} />}
			dragData={{
				id: effect.type,
				name: effect.name,
				type: "effect",
				effectType: effect.type,
				targetElementTypes: category === "transition" ? [] : EFFECT_TARGET_ELEMENT_TYPES,
			}}
			onAddToTimeline={handleAddToTimeline}
			aspectRatio={1}
			isRounded
			variant="card"
			containerClassName="w-full"
		/>
	);
}

/** Center a 1s transition on the nearest cut, or on the playhead. */
function transitionStartTime({ editor }: { editor: EditorCore }): MediaTime {
	const playhead = editor.playback.getCurrentTime();
	const playheadSeconds = mediaTimeToSeconds({ time: playhead });
	const tracks = editor.scenes.getActiveScene().tracks;
	const cuts: number[] = [];
	const collect = (elements: Array<{ startTime: MediaTime; duration: MediaTime }>) => {
		for (const element of elements) {
			const start = mediaTimeToSeconds({ time: element.startTime });
			cuts.push(start);
			cuts.push(start + mediaTimeToSeconds({ time: element.duration }));
		}
	};
	collect(tracks.main.elements);
	for (const track of tracks.overlay) {
		if (track.type === "effect") continue;
		collect(track.elements);
	}
	let centerSeconds = playheadSeconds;
	let best = 1.5;
	for (const cut of cuts) {
		const distance = Math.abs(cut - playheadSeconds);
		if (distance <= best) {
			centerSeconds = cut;
			best = distance;
		}
	}
	return mediaTimeFromSeconds({ seconds: Math.max(0, centerSeconds - 0.5) });
}
