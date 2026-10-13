import {
	applyEffectPasses,
	applyMaskFeather as applyMaskFeatherWasm,
	initializeGpu,
} from "opencut-wasm";
import {
	applyCanvasEffectPasses,
	isCanvasEffectShader,
} from "@/opencut/effects/canvas/apply";
import type { EffectPass, EffectUniformValue } from "@/opencut/effects/types";

let gpuAvailable = false;
let initPromise: Promise<void> | null = null;

export function initializeGpuRenderer(): Promise<void> {
	if (!initPromise) {
		initPromise = initializeGpu()
			.then(() => {
				gpuAvailable = true;
			})
			.catch((error: unknown) => {
				gpuAvailable = false;
				const message = error instanceof Error ? error.message : String(error);
				console.warn(`GPU renderer unavailable: ${message}`);
			});
	}
	return initPromise;
}

export function isGpuAvailable(): boolean {
	return gpuAvailable;
}

export const gpuRenderer = {
	applyEffect({
		source,
		width,
		height,
		passes,
	}: {
		source: OffscreenCanvas;
		width: number;
		height: number;
		passes: EffectPass[];
	}): OffscreenCanvas {
		if (passes.length === 0) {
			return source;
		}

		// Canvas effects never go to wasm: that build only knows gaussian-blur.
		let current = source;
		let wasmPasses: EffectPass[] = [];
		const flushWasm = () => {
			if (wasmPasses.length === 0) return;
			if (gpuAvailable) {
				current = applyEffectPasses({
					source: current,
					width,
					height,
					passes: serializeEffectPasses(wasmPasses),
				});
			}
			wasmPasses = [];
		};

		for (const pass of passes) {
			if (isCanvasEffectShader(pass.shader)) {
				flushWasm();
				current = applyCanvasEffectPasses({
					source: current,
					width,
					height,
					passes: [pass],
				});
				continue;
			}
			wasmPasses.push(pass);
		}
		flushWasm();
		return current;
	},

	applyMaskFeather({
		maskCanvas,
		width,
		height,
		feather,
	}: {
		maskCanvas: OffscreenCanvas;
		width: number;
		height: number;
		feather: number;
	}): OffscreenCanvas {
		if (!gpuAvailable) {
			return maskCanvas;
		}

		return applyMaskFeatherWasm({
			mask: maskCanvas,
			width,
			height,
			feather,
		});
	},
};

function serializeEffectPasses(passes: EffectPass[]) {
	return passes.map((pass) => ({
		shader: pass.shader,
		uniforms: Object.entries(pass.uniforms).map(([name, value]) => ({
			name,
			value: normalizeUniformValue(value),
		})),
	}));
}

function normalizeUniformValue(value: EffectUniformValue): number[] {
	return typeof value === "number" ? [value] : value;
}
