"use client";

import { useCallback } from "react";
import { PanelView } from "@/opencut/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/opencut/components/editor/panels/assets/draggable-item";
import { CatalogThumb } from "@/opencut/effects/components/catalog-thumb";
import { TransitionCatalogMenu } from "@/opencut/effects/components/transition-catalog-menu";
import { effectsRegistry, registerDefaultEffects } from "@/opencut/effects";
import { effectTimingAt, transitionTimingAt } from "@/opencut/effects/effect-timing";
import type { EffectCategory, EffectDefinition } from "@/opencut/effects/types";
import { useEditor } from "@/opencut/editor/use-editor";
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
		// Transitions stick to a video head, tail, or cut. Other effects keep the wider snap.
		const timing =
			category === "transition"
				? transitionTimingAt({ time, tracks })
				: effectTimingAt({ time, tracks });
		const element = buildEffectElement({
			effectType: effect.type,
			startTime: timing.startTime,
			duration: timing.duration,
		});
		editor.timeline.insertElement({
			placement: { mode: "auto", trackType: "effect" },
			element,
		});
	}, [editor, effect.type]);

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
				targetElementTypes: [],
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
