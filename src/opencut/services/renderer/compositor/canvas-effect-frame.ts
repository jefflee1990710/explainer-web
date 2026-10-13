import type { EffectPass } from "@/opencut/effects/types";
import { applyCanvasEffectPasses, isCanvasEffectShader } from "@/opencut/effects/canvas/apply";
import type { FrameDescriptor, FrameItemDescriptor } from "./types";

type LayerItem = Extract<FrameItemDescriptor, { type: "layer" }>;

/**
 * Splits a frame so gaussian-blur stays in opencut-wasm and every other
 * effect is applied to the pixels in JS. The wasm package rejects unknown
 * shader ids, which would blank the preview.
 */
export function frameHasCanvasEffect(frame: FrameDescriptor): boolean {
	for (const item of frame.items) {
		for (const group of item.effectPassGroups) {
			if (group.some((pass) => isCanvasEffectShader(pass.shader))) {
				return true;
			}
		}
	}
	return false;
}

export function renderFrameResolvingCanvasEffects({
	frame,
	renderWasm,
	upload,
	snapshotCompositor,
}: {
	frame: FrameDescriptor;
	renderWasm: (frame: FrameDescriptor) => void;
	upload: (canvas: OffscreenCanvas) => string;
	snapshotCompositor: () => OffscreenCanvas;
}): void {
	const width = frame.width;
	const height = frame.height;
	let held: OffscreenCanvas | null = null;
	let onCompositor = false;
	let wasmItems: FrameItemDescriptor[] = [];

	const currentScene = (): OffscreenCanvas => {
		if (held) return held;
		if (onCompositor) return snapshotCompositor();
		return solidCanvas({ color: frame.clear.color, width, height });
	};

	const flushWasmItems = () => {
		if (wasmItems.length === 0) return;
		const items: FrameItemDescriptor[] = [];
		let clear = frame.clear;
		if (held || onCompositor) {
			const base = held ?? snapshotCompositor();
			items.push(
				fullFrameLayer({
					textureId: upload(base),
					width,
					height,
				}),
			);
			clear = { color: [0, 0, 0, 0] };
			held = null;
		}
		items.push(...wasmItems);
		renderWasm({ width, height, clear, items });
		wasmItems = [];
		onCompositor = true;
		held = null;
	};

	const pushScenePasses = (passes: EffectPass[]) => {
		let wasmPasses: EffectPass[] = [];
		const flushWasmPasses = () => {
			if (wasmPasses.length === 0) return;
			wasmItems.push({
				type: "sceneEffect",
				effectPassGroups: [wasmPasses],
			});
			wasmPasses = [];
		};

		for (const pass of passes) {
			if (!isCanvasEffectShader(pass.shader)) {
				wasmPasses.push(pass);
				continue;
			}
			flushWasmPasses();
			flushWasmItems();
			held = applyCanvasEffectPasses({
				source: currentScene(),
				width,
				height,
				passes: [pass],
			});
			onCompositor = false;
		}
		flushWasmPasses();
	};

	for (const item of frame.items) {
		if (item.type === "sceneEffect") {
			for (const group of item.effectPassGroups) {
				pushScenePasses(group);
			}
			continue;
		}

		if (!layerHasCanvasEffect(item)) {
			wasmItems.push(item);
			continue;
		}

		flushWasmItems();
		if (!held) {
			held = currentScene();
			onCompositor = false;
		}
		wasmItems.push(
			bakeLayerEffects({
				layer: item,
				width,
				height,
				renderWasm,
				upload,
				snapshotCompositor,
			}),
		);
		onCompositor = false;
	}

	flushWasmItems();
	if (held) {
		renderWasm({
			width,
			height,
			clear: { color: [0, 0, 0, 0] },
			items: [
				fullFrameLayer({
					textureId: upload(held),
					width,
					height,
				}),
			],
		});
	}
}

function layerHasCanvasEffect(layer: LayerItem): boolean {
	return layer.effectPassGroups.some((group) =>
		group.some((pass) => isCanvasEffectShader(pass.shader)),
	);
}

/**
 * Draws one layer, applies its canvas effects in order, and returns a
 * full-frame layer. Opacity is baked. Blend mode and mask stay for the
 * final composite, matching the wasm order: effects, then mask, then blend.
 */
function bakeLayerEffects({
	layer,
	width,
	height,
	renderWasm,
	upload,
	snapshotCompositor,
}: {
	layer: LayerItem;
	width: number;
	height: number;
	renderWasm: (frame: FrameDescriptor) => void;
	upload: (canvas: OffscreenCanvas) => string;
	snapshotCompositor: () => OffscreenCanvas;
}): LayerItem {
	let image: OffscreenCanvas | null = null;
	let pendingWasm: EffectPass[] = [];

	const drawLayer = (groups: EffectPass[][]) => {
		renderWasm({
			width,
			height,
			clear: { color: [0, 0, 0, 0] },
			items: [
				{
					...layer,
					blendMode: "normal",
					effectPassGroups: groups,
					mask: null,
				},
			],
		});
		return snapshotCompositor();
	};

	const drawUploaded = (source: OffscreenCanvas, groups: EffectPass[][]) => {
		renderWasm({
			width,
			height,
			clear: { color: [0, 0, 0, 0] },
			items: [
				{
					type: "layer",
					textureId: upload(source),
					transform: fullFrameTransform({ width, height }),
					opacity: 1,
					blendMode: "normal",
					effectPassGroups: groups,
					mask: null,
				},
			],
		});
		return snapshotCompositor();
	};

	const flushPending = () => {
		if (pendingWasm.length === 0) return;
		image = image ? drawUploaded(image, [pendingWasm]) : drawLayer([pendingWasm]);
		pendingWasm = [];
	};

	for (const group of layer.effectPassGroups) {
		for (const pass of group) {
			if (!isCanvasEffectShader(pass.shader)) {
				pendingWasm.push(pass);
				continue;
			}
			flushPending();
			if (!image) image = drawLayer([]);
			image = applyCanvasEffectPasses({
				source: image,
				width,
				height,
				passes: [pass],
			});
		}
	}
	flushPending();
	if (!image) image = drawLayer([]);

	return {
		type: "layer",
		textureId: upload(image),
		transform: fullFrameTransform({ width, height }),
		opacity: 1,
		blendMode: layer.blendMode,
		effectPassGroups: [],
		mask: layer.mask,
	};
}

function fullFrameLayer({
	textureId,
	width,
	height,
}: {
	textureId: string;
	width: number;
	height: number;
}): LayerItem {
	return {
		type: "layer",
		textureId,
		transform: fullFrameTransform({ width, height }),
		opacity: 1,
		blendMode: "normal",
		effectPassGroups: [],
		mask: null,
	};
}

function fullFrameTransform({ width, height }: { width: number; height: number }) {
	return {
		centerX: width / 2,
		centerY: height / 2,
		width,
		height,
		rotationDegrees: 0,
		flipX: false,
		flipY: false,
	};
}

function solidCanvas({
	color,
	width,
	height,
}: {
	color: [number, number, number, number];
	width: number;
	height: number;
}): OffscreenCanvas {
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Failed to allocate effect canvas");
	}
	const red = Math.round(color[0] * 255);
	const green = Math.round(color[1] * 255);
	const blue = Math.round(color[2] * 255);
	context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${color[3]})`;
	context.fillRect(0, 0, width, height);
	return canvas;
}
