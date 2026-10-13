"use client";

import { EffectCatalog } from "@/opencut/effects/components/catalog-grid";

export function EffectsView() {
	return <EffectCatalog category="effect" title="Effects" />;
}

export function AdjustmentsView() {
	return <EffectCatalog category="adjustment" title="Adjustment" />;
}

export function TransitionsView() {
	return <EffectCatalog category="transition" title="Transitions" />;
}
