import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCanvasShaderToPixels, transitionPhase } from "@/opencut/effects/canvas/pixels";
import {
	adjustmentEffectDefinitions,
	lookEffectDefinitions,
} from "@/opencut/effects/definitions/adjustments";
import { blurEffectDefinition } from "@/opencut/effects/definitions/blur";
import { transitionEffectDefinitions, transitionStrength } from "@/opencut/effects/definitions/transitions";
import type { EffectDefinition } from "@/opencut/effects/types";

function passesFor(definition: EffectDefinition, params: Record<string, number>) {
	return (
		definition.renderer.buildPasses?.({
			effectParams: params,
			width: 160,
			height: 160,
		}) ?? []
	);
}

function fill({
	width,
	height,
	pixel,
}: {
	width: number;
	height: number;
	pixel: (x: number, y: number) => [number, number, number, number];
}): Uint8ClampedArray {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const [r, g, b, a] = pixel(x, y);
			const index = (y * width + x) * 4;
			data[index] = r;
			data[index + 1] = g;
			data[index + 2] = b;
			data[index + 3] = a;
		}
	}
	return data;
}

function at(data: Uint8ClampedArray, x: number, y: number, width: number): number[] {
	const index = (y * width + x) * 4;
	return [data[index], data[index + 1], data[index + 2], data[index + 3]];
}

describe("canvas effect pixels", () => {
	it("keeps brightness at 50 and doubles it at 100", () => {
		const same = fill({
			width: 1,
			height: 1,
			pixel: () => [40, 80, 120, 255],
		});
		applyCanvasShaderToPixels({
			data: same,
			width: 1,
			height: 1,
			shader: "canvas:brightness",
			uniforms: { u_amount: 50 },
		});
		assert.deepEqual(at(same, 0, 0, 1), [40, 80, 120, 255]);

		const bright = fill({
			width: 1,
			height: 1,
			pixel: () => [40, 10, 0, 255],
		});
		applyCanvasShaderToPixels({
			data: bright,
			width: 1,
			height: 1,
			shader: "canvas:brightness",
			uniforms: { u_amount: 100 },
		});
		assert.deepEqual(at(bright, 0, 0, 1), [80, 20, 0, 255]);
	});

	it("leaves transparent pixels alone", () => {
		const data = fill({
			width: 1,
			height: 1,
			pixel: () => [40, 0, 0, 0],
		});
		applyCanvasShaderToPixels({
			data,
			width: 1,
			height: 1,
			shader: "canvas:brightness",
			uniforms: { u_amount: 100 },
		});
		assert.deepEqual(at(data, 0, 0, 1), [40, 0, 0, 0]);
	});

	it("flattens contrast at 0 and keeps it at 50", () => {
		const flat = fill({
			width: 1,
			height: 1,
			pixel: () => [200, 20, 20, 255],
		});
		applyCanvasShaderToPixels({
			data: flat,
			width: 1,
			height: 1,
			shader: "canvas:contrast",
			uniforms: { u_amount: 0 },
		});
		assert.deepEqual(at(flat, 0, 0, 1), [128, 128, 128, 255]);
	});

	it("grays a red pixel at zero saturation and full grayscale", () => {
		const washed = fill({
			width: 1,
			height: 1,
			pixel: () => [200, 0, 0, 255],
		});
		applyCanvasShaderToPixels({
			data: washed,
			width: 1,
			height: 1,
			shader: "canvas:saturation",
			uniforms: { u_amount: 0 },
		});
		const [r, g, b] = at(washed, 0, 0, 1);
		assert.equal(r, g);
		assert.equal(g, b);

		const gray = fill({
			width: 1,
			height: 1,
			pixel: () => [200, 0, 0, 255],
		});
		applyCanvasShaderToPixels({
			data: gray,
			width: 1,
			height: 1,
			shader: "canvas:grayscale",
			uniforms: { u_amount: 100 },
		});
		const grayPixel = at(gray, 0, 0, 1);
		assert.equal(grayPixel[0], grayPixel[1]);
		assert.equal(grayPixel[1], grayPixel[2]);
	});

	it("warms by lifting red and dropping blue", () => {
		const data = fill({
			width: 1,
			height: 1,
			pixel: () => [100, 100, 100, 255],
		});
		applyCanvasShaderToPixels({
			data,
			width: 1,
			height: 1,
			shader: "canvas:warmth",
			uniforms: { u_amount: 100 },
		});
		const [r, g, b] = at(data, 0, 0, 1);
		assert.ok(r > 100);
		assert.equal(g, 100);
		assert.ok(b < 100);
	});

	it("rotates hue and inverts", () => {
		const hue = fill({
			width: 1,
			height: 1,
			pixel: () => [200, 20, 20, 255],
		});
		applyCanvasShaderToPixels({
			data: hue,
			width: 1,
			height: 1,
			shader: "canvas:hue",
			uniforms: { u_amount: 180 },
		});
		const [r, , b] = at(hue, 0, 0, 1);
		assert.ok(b > r);

		const inverted = fill({
			width: 1,
			height: 1,
			pixel: () => [10, 20, 30, 255],
		});
		applyCanvasShaderToPixels({
			data: inverted,
			width: 1,
			height: 1,
			shader: "canvas:invert",
			uniforms: { u_amount: 100 },
		});
		assert.deepEqual(at(inverted, 0, 0, 1), [245, 235, 225, 255]);
	});

	it("darkens the corner more than the center", () => {
		const data = fill({
			width: 8,
			height: 8,
			pixel: () => [220, 220, 220, 255],
		});
		applyCanvasShaderToPixels({
			data,
			width: 8,
			height: 8,
			shader: "canvas:vignette",
			uniforms: { u_amount: 100 },
		});
		const center = at(data, 4, 4, 8)[0];
		const corner = at(data, 0, 0, 8)[0];
		assert.ok(center > corner);
		assert.ok(corner < 80);
	});

	it("copies the block origin when pixelating", () => {
		const data = fill({
			width: 4,
			height: 4,
			pixel: (x) => (x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255]),
		});
		applyCanvasShaderToPixels({
			data,
			width: 4,
			height: 4,
			shader: "canvas:pixelate",
			uniforms: { u_amount: 100 },
		});
		assert.deepEqual(at(data, 1, 1, 4), at(data, 0, 0, 4));
		assert.deepEqual(at(data, 3, 0, 4), at(data, 2, 0, 4));
	});

	it("raises a bright pixel when sharpening", () => {
		const data = fill({
			width: 3,
			height: 3,
			pixel: (x, y) => (x === 1 && y === 1 ? [180, 180, 180, 255] : [20, 20, 20, 255]),
		});
		applyCanvasShaderToPixels({
			data,
			width: 3,
			height: 3,
			shader: "canvas:sharpen",
			uniforms: { u_amount: 100 },
		});
		assert.ok(at(data, 1, 1, 3)[0] > 180);
	});

	it("adds deterministic grain", () => {
		const once = fill({
			width: 2,
			height: 2,
			pixel: () => [128, 128, 128, 255],
		});
		const twice = once.slice();
		applyCanvasShaderToPixels({
			data: once,
			width: 2,
			height: 2,
			shader: "canvas:grain",
			uniforms: { u_amount: 80, u_seed: 7 },
		});
		applyCanvasShaderToPixels({
			data: twice,
			width: 2,
			height: 2,
			shader: "canvas:grain",
			uniforms: { u_amount: 80, u_seed: 7 },
		});
		assert.deepEqual(Array.from(once), Array.from(twice));
		assert.notDeepEqual(at(once, 0, 0, 2), [128, 128, 128, 255]);
	});

	it("lifts a dark pixel in shadows and covers a wipe from the left", () => {
		const shadows = fill({
			width: 1,
			height: 1,
			pixel: () => [20, 20, 20, 255],
		});
		applyCanvasShaderToPixels({
			data: shadows,
			width: 1,
			height: 1,
			shader: "canvas:shadows",
			uniforms: { u_amount: 100 },
		});
		assert.ok(at(shadows, 0, 0, 1)[0] > 20);

		const wipe = fill({
			width: 4,
			height: 2,
			pixel: () => [200, 40, 40, 255],
		});
		applyCanvasShaderToPixels({
			data: wipe,
			width: 4,
			height: 2,
			shader: "canvas:wipe",
			uniforms: { u_progress: 0.25, u_amount: 100, u_direction: 0 },
		});
		assert.deepEqual(at(wipe, 0, 0, 4).slice(0, 3), [0, 0, 0]);
		assert.deepEqual(at(wipe, 3, 0, 4).slice(0, 3), [200, 40, 40]);
	});

	it("turns blue toward brown with sepia", () => {
		const data = fill({
			width: 1,
			height: 1,
			pixel: () => [20, 40, 200, 255],
		});
		applyCanvasShaderToPixels({
			data,
			width: 1,
			height: 1,
			shader: "canvas:sepia",
			uniforms: { u_amount: 100 },
		});
		const [r, , b] = at(data, 0, 0, 1);
		assert.ok(r > b);
	});
});

describe("editor effect catalog", () => {
	it("splits effects, adjustments, and transitions", () => {
		assert.equal(blurEffectDefinition.category, "effect");
		assert.equal(blurEffectDefinition.renderer.passes[0]?.shader, "gaussian-blur");
		assert.ok(blurEffectDefinition.preview.length > 0);

		assert.deepEqual(
			lookEffectDefinitions.map((definition) => definition.type),
			["grayscale", "sepia", "invert", "vignette", "pixelate", "grain"],
		);
		assert.deepEqual(
			adjustmentEffectDefinitions.map((definition) => definition.type),
			[
				"brightness",
				"contrast",
				"saturation",
				"warmth",
				"hue",
				"sharpen",
				"fade",
				"shadows",
				"highlights",
				"vibrance",
			],
		);
		assert.ok(adjustmentEffectDefinitions.every((definition) => definition.category === "adjustment"));
		assert.deepEqual(passesFor(adjustmentEffectDefinitions[0], { amount: 50 }), []);

		assert.deepEqual(
			transitionEffectDefinitions.map((definition) => definition.type),
			["dip", "flash", "wipe", "wipe-right", "iris", "slide", "zoom", "blur-in"],
		);
		assert.equal(transitionStrength({ progress: 0, amount: 100 }), 0);
		assert.equal(transitionPhase(0.5), 1);
		const fade = transitionEffectDefinitions[0];
		assert.equal(passesFor(fade, { progress: 0, amount: 100 }).length, 0);
		assert.equal(passesFor(fade, { progress: 0.5, amount: 100 })[0]?.shader, "canvas:dip-black");
		const blurIn = transitionEffectDefinitions.find((definition) => definition.type === "blur-in");
		assert.equal(passesFor(blurIn!, { progress: 0.5, amount: 100 })[0]?.shader, "gaussian-blur");
	});
});
