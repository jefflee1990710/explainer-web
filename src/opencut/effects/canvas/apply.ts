import type { EffectPass } from "@/opencut/effects/types";
import { applyCanvasShaderToPixels } from "./pixels";

export { isCanvasEffectShader } from "./pixels";

/** Runs canvas-shader passes on a 2D bitmap and returns a new canvas. */
export function applyCanvasEffectPasses({
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
	let current = source;
	for (const pass of passes) {
		current = applyOnePass({ source: current, width, height, pass });
	}
	return current;
}

function applyOnePass({
	source,
	width,
	height,
	pass,
}: {
	source: OffscreenCanvas;
	width: number;
	height: number;
	pass: EffectPass;
}): OffscreenCanvas {
	const readable = ensureReadableCanvas({ source, width, height });
	const context = readable.getContext("2d", { willReadFrequently: true });
	if (!context) return source;

	const image = context.getImageData(0, 0, width, height);
	applyCanvasShaderToPixels({
		data: image.data,
		width,
		height,
		shader: pass.shader,
		uniforms: pass.uniforms,
	});

	const next = new OffscreenCanvas(width, height);
	const nextContext = next.getContext("2d");
	if (!nextContext) return source;
	nextContext.putImageData(image, 0, 0);
	return next;
}

function ensureReadableCanvas({
	source,
	width,
	height,
}: {
	source: OffscreenCanvas;
	width: number;
	height: number;
}): OffscreenCanvas {
	if (source.width === width && source.height === height && source.getContext("2d")) {
		return source;
	}

	const copy = new OffscreenCanvas(width, height);
	const context = copy.getContext("2d");
	if (!context) {
		throw new Error("Failed to copy effect source");
	}
	context.drawImage(source, 0, 0, width, height);
	return copy;
}
