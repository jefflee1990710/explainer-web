import { effectsRegistry } from "../registry";
import { adjustmentEffectDefinitions, lookEffectDefinitions } from "./adjustments";
import { blurEffectDefinition } from "./blur";
import { transitionEffectDefinitions } from "./transitions";

const defaultEffects = [
	blurEffectDefinition,
	...lookEffectDefinitions,
	...adjustmentEffectDefinitions,
	...transitionEffectDefinitions,
];

export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register({
			key: definition.type,
			definition,
		});
	}
}
