"use client";

import { useCallback } from "react";
import { TracksSnapshotCommand } from "@/opencut/commands/timeline";
import { PanelView } from "@/opencut/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/opencut/components/editor/panels/assets/draggable-item";
import { upsertTransitionElementInTracks } from "@/opencut/effects/apply-all-transitions";
import { CatalogThumb } from "@/opencut/effects/components/catalog-thumb";
import { TransitionCatalogMenu } from "@/opencut/effects/components/transition-catalog-menu";
import { effectsRegistry, registerDefaultEffects } from "@/opencut/effects";
import {
	canPlaceTransitionOnTracks,
	effectTimingAt,
	transitionTimingAt,
} from "@/opencut/effects/effect-timing";
import type { EffectCategory, EffectDefinition } from "@/opencut/effects/types";
import { useEditor } from "@/opencut/editor/use-editor";
import { isVisualElement, VISUAL_ELEMENT_TYPES } from "@/opencut/timeline";
import { buildEffectElement } from "@/opencut/timeline/element-utils";

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
		const tracks = editor.scenes.getActiveScene().tracks;
		const time = editor.playback.getCurrentTime();

		if (category === "transition") {
			if (!canPlaceTransitionOnTracks({ tracks })) return;
			const timing = transitionTimingAt({ time, tracks });
			const element = buildEffectElement({
				effectType: effect.type,
				startTime: timing.startTime,
				duration: timing.duration,
			});
			const updated = upsertTransitionElementInTracks({ tracks, element });
			if (!updated) return;
			editor.command.execute({
				command: new TracksSnapshotCommand({ before: tracks, after: updated }),
			});
			return;
		}

		// If the user has visual element(s) selected, attach the effect directly to those clip(s).
		const selectedRefs = editor.selection.getSelectedElements();
		if (selectedRefs.length > 0) {
			const selectedVisuals = editor.timeline
				.getElementsWithTracks({ elements: [...selectedRefs] })
				.filter(({ element }) => isVisualElement(element));
			if (selectedVisuals.length > 0) {
				for (const { track, element } of selectedVisuals) {
					editor.timeline.addClipEffect({
						trackId: track.id,
						elementId: element.id,
						effectType: effect.type,
					});
				}
				return;
			}
		}

		const timing = effectTimingAt({ time, tracks });
		const element = buildEffectElement({
			effectType: effect.type,
			startTime: timing.startTime,
			duration: timing.duration,
		});
		editor.timeline.insertElement({
			placement: { mode: "auto", trackType: "effect" },
			element,
		});
	}, [category, editor, effect.type]);

	const card = (
		<DraggableItem
			name={effect.name}
			preview={<CatalogThumb category={category} type={effect.type} />}
			dragData={{
				id: effect.type,
				name: effect.name,
				type: "effect",
				effectType: effect.type,
				placement: category === "transition" ? "edge" : "anywhere",
				targetElementTypes:
					category === "transition" ? [] : [...VISUAL_ELEMENT_TYPES],
			}}
			onAddToTimeline={handleAddToTimeline}
			aspectRatio={1}
			isRounded
			variant="card"
			containerClassName="w-full"
		/>
	);

	if (category !== "transition") return card;

	return (
		<TransitionCatalogMenu effectType={effect.type} onAddHere={handleAddToTimeline}>
			{card}
		</TransitionCatalogMenu>
	);
}
