"use client";

import { EffectCatalog } from "@/opencut/effects/components/catalog-grid";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";

export function EffectsView() {
	const { oc } = useOpencutI18n();
	return <EffectCatalog category="effect" title={oc.rail.effects} />;
}

export function AdjustmentsView() {
	const { oc } = useOpencutI18n();
	return <EffectCatalog category="adjustment" title={oc.rail.adjustment} />;
}

export function TransitionsView() {
	const { oc } = useOpencutI18n();
	return <EffectCatalog category="transition" title={oc.rail.transitions} />;
}
