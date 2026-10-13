import type { EffectUniformValue } from "@/opencut/effects/types";

/**
 * Color effects run here because the published opencut-wasm build only
 * compiles the gaussian-blur shader. Unknown shader ids fail at render time.
 */
export const CANVAS_EFFECT_SHADER_PREFIX = "canvas:";

export function isCanvasEffectShader(shader: string): boolean {
	return shader.startsWith(CANVAS_EFFECT_SHADER_PREFIX);
}

type Uniforms = Record<string, EffectUniformValue>;

export function applyCanvasShaderToPixels({
	data,
	width,
	height,
	shader,
	uniforms,
}: {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	shader: string;
	uniforms: Uniforms;
}): void {
	if (width <= 0 || height <= 0) return;

	switch (shader) {
		case "canvas:brightness":
			applyGain({ data, gain: readUniform(uniforms, "u_amount", 50) / 50 });
			return;
		case "canvas:contrast":
			applyContrast({ data, gain: readUniform(uniforms, "u_amount", 50) / 50 });
			return;
		case "canvas:saturation":
			applySaturation({ data, gain: readUniform(uniforms, "u_amount", 50) / 50 });
			return;
		case "canvas:warmth":
			applyWarmth({ data, amount: readUniform(uniforms, "u_amount", 50) });
			return;
		case "canvas:hue":
			applyHue({ data, degrees: readUniform(uniforms, "u_amount", 0) });
			return;
		case "canvas:grayscale":
			applyMixLuma({ data, amount: readUniform(uniforms, "u_amount", 0) / 100 });
			return;
		case "canvas:sepia":
			applySepia({ data, amount: readUniform(uniforms, "u_amount", 0) / 100 });
			return;
		case "canvas:invert":
			applyInvert({ data, amount: readUniform(uniforms, "u_amount", 0) / 100 });
			return;
		case "canvas:vignette":
			applyVignette({
				data,
				width,
				height,
				amount: readUniform(uniforms, "u_amount", 0) / 100,
			});
			return;
		case "canvas:pixelate":
			applyPixelate({
				data,
				width,
				height,
				amount: readUniform(uniforms, "u_amount", 0),
			});
			return;
		case "canvas:sharpen":
			applySharpen({
				data,
				width,
				height,
				amount: readUniform(uniforms, "u_amount", 0) / 100,
			});
			return;
		case "canvas:grain":
			applyGrain({
				data,
				width,
				height,
				amount: readUniform(uniforms, "u_amount", 0) / 100,
				seed: readUniform(uniforms, "u_seed", 1),
			});
			return;
		case "canvas:fade":
			applyFade({ data, amount: readUniform(uniforms, "u_amount", 0) / 100 });
			return;
		case "canvas:shadows":
			applyShadows({ data, amount: readUniform(uniforms, "u_amount", 0) / 100 });
			return;
		case "canvas:highlights":
			applyHighlights({ data, amount: readUniform(uniforms, "u_amount", 0) / 100 });
			return;
		case "canvas:vibrance":
			applyVibrance({ data, amount: readUniform(uniforms, "u_amount", 0) / 100 });
			return;
		case "canvas:dip-black":
		case "canvas:dip-white":
		case "canvas:wipe":
		case "canvas:iris":
		case "canvas:slide":
		case "canvas:zoom":
			applyTransition({
				data,
				width,
				height,
				shader,
				progress: readUniform(uniforms, "u_progress", 0),
				amount: readUniform(uniforms, "u_amount", 100) / 100,
				direction: readUniform(uniforms, "u_direction", 0),
			});
			return;
		default:
			return;
	}
}

function readUniform(uniforms: Uniforms, key: string, fallback: number): number {
	const value = uniforms[key];
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (Array.isArray(value) && typeof value[0] === "number" && Number.isFinite(value[0])) {
		return value[0];
	}
	return fallback;
}

function applyGain({ data, gain }: { data: Uint8ClampedArray; gain: number }): void {
	if (Math.abs(gain - 1) < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		data[index] = data[index] * gain;
		data[index + 1] = data[index + 1] * gain;
		data[index + 2] = data[index + 2] * gain;
	}
}

function applyContrast({ data, gain }: { data: Uint8ClampedArray; gain: number }): void {
	if (Math.abs(gain - 1) < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		data[index] = (data[index] - 128) * gain + 128;
		data[index + 1] = (data[index + 1] - 128) * gain + 128;
		data[index + 2] = (data[index + 2] - 128) * gain + 128;
	}
}

function applySaturation({ data, gain }: { data: Uint8ClampedArray; gain: number }): void {
	if (Math.abs(gain - 1) < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		const luma = lumaOf(data[index], data[index + 1], data[index + 2]);
		data[index] = luma + (data[index] - luma) * gain;
		data[index + 1] = luma + (data[index + 1] - luma) * gain;
		data[index + 2] = luma + (data[index + 2] - luma) * gain;
	}
}

function applyWarmth({ data, amount }: { data: Uint8ClampedArray; amount: number }): void {
	const shift = ((amount - 50) / 50) * 48;
	if (Math.abs(shift) < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		data[index] = data[index] + shift;
		data[index + 2] = data[index + 2] - shift;
	}
}

function applyHue({ data, degrees }: { data: Uint8ClampedArray; degrees: number }): void {
	const turns = ((degrees % 360) + 360) % 360;
	if (turns < 0.001 || turns > 359.999) return;
	const radians = (turns * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const m00 = 0.213 + cos * 0.787 - sin * 0.213;
	const m01 = 0.715 - cos * 0.715 - sin * 0.715;
	const m02 = 0.072 - cos * 0.072 + sin * 0.928;
	const m10 = 0.213 - cos * 0.213 + sin * 0.143;
	const m11 = 0.715 + cos * 0.285 + sin * 0.14;
	const m12 = 0.072 - cos * 0.072 - sin * 0.283;
	const m20 = 0.213 - cos * 0.213 - sin * 0.787;
	const m21 = 0.715 - cos * 0.715 + sin * 0.715;
	const m22 = 0.072 + cos * 0.928 + sin * 0.072;

	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		const r = data[index];
		const g = data[index + 1];
		const b = data[index + 2];
		data[index] = r * m00 + g * m01 + b * m02;
		data[index + 1] = r * m10 + g * m11 + b * m12;
		data[index + 2] = r * m20 + g * m21 + b * m22;
	}
}

function applyMixLuma({ data, amount }: { data: Uint8ClampedArray; amount: number }): void {
	const mix = clamp01(amount);
	if (mix < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		const luma = lumaOf(data[index], data[index + 1], data[index + 2]);
		data[index] = data[index] + (luma - data[index]) * mix;
		data[index + 1] = data[index + 1] + (luma - data[index + 1]) * mix;
		data[index + 2] = data[index + 2] + (luma - data[index + 2]) * mix;
	}
}

function applySepia({ data, amount }: { data: Uint8ClampedArray; amount: number }): void {
	const mix = clamp01(amount);
	if (mix < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		const r = data[index];
		const g = data[index + 1];
		const b = data[index + 2];
		const sr = r * 0.393 + g * 0.769 + b * 0.189;
		const sg = r * 0.349 + g * 0.686 + b * 0.168;
		const sb = r * 0.272 + g * 0.534 + b * 0.131;
		data[index] = r + (sr - r) * mix;
		data[index + 1] = g + (sg - g) * mix;
		data[index + 2] = b + (sb - b) * mix;
	}
}

function applyInvert({ data, amount }: { data: Uint8ClampedArray; amount: number }): void {
	const mix = clamp01(amount);
	if (mix < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		data[index] = data[index] + (255 - data[index] - data[index]) * mix;
		data[index + 1] = data[index + 1] + (255 - data[index + 1] - data[index + 1]) * mix;
		data[index + 2] = data[index + 2] + (255 - data[index + 2] - data[index + 2]) * mix;
	}
}

function applyVignette({
	data,
	width,
	height,
	amount,
}: {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	amount: number;
}): void {
	const strength = clamp01(amount);
	if (strength < 0.001) return;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4;
			if (data[index + 3] === 0) continue;
			const dx = (x + 0.5) / width - 0.5;
			const dy = (y + 0.5) / height - 0.5;
			const distance = Math.hypot(dx, dy) / Math.SQRT1_2;
			const edge = distance * distance * (3 - 2 * Math.min(1, distance));
			const darkness = smoothstep(0.25, 1, edge) * strength;
			const keep = 1 - darkness;
			data[index] = data[index] * keep;
			data[index + 1] = data[index + 1] * keep;
			data[index + 2] = data[index + 2] * keep;
		}
	}
}

function applyPixelate({
	data,
	width,
	height,
	amount,
}: {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	amount: number;
}): void {
	const span = Math.max(
		1,
		Math.round(1 + (clamp01(amount / 100) * Math.min(width, height) * 0.22)),
	);
	if (span <= 1) return;
	const source = data.slice();
	for (let y = 0; y < height; y++) {
		const originY = Math.min(height - 1, Math.floor(y / span) * span);
		for (let x = 0; x < width; x++) {
			const originX = Math.min(width - 1, Math.floor(x / span) * span);
			const from = (originY * width + originX) * 4;
			const to = (y * width + x) * 4;
			data[to] = source[from];
			data[to + 1] = source[from + 1];
			data[to + 2] = source[from + 2];
			data[to + 3] = source[from + 3];
		}
	}
}

function applySharpen({
	data,
	width,
	height,
	amount,
}: {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	amount: number;
}): void {
	const mix = clamp01(amount);
	if (mix < 0.001 || width < 3 || height < 3) return;
	const source = data.slice();
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const index = (y * width + x) * 4;
			if (source[index + 3] === 0) continue;
			for (let channel = 0; channel < 3; channel++) {
				const center = source[index + channel];
				const up = source[index - width * 4 + channel];
				const down = source[index + width * 4 + channel];
				const left = source[index - 4 + channel];
				const right = source[index + 4 + channel];
				const sharpened = center * (1 + 4 * mix) - (up + down + left + right) * mix;
				data[index + channel] = sharpened;
			}
		}
	}
}

function applyGrain({
	data,
	width,
	height,
	amount,
	seed,
}: {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	amount: number;
	seed: number;
}): void {
	const mix = clamp01(amount);
	if (mix < 0.001) return;
	const amplitude = mix * 70;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4;
			if (data[index + 3] === 0) continue;
			const delta = (grainUnit(x, y, seed) - 0.5) * 2 * amplitude;
			data[index] = data[index] + delta;
			data[index + 1] = data[index + 1] + delta;
			data[index + 2] = data[index + 2] + delta;
		}
	}
}

function applyFade({ data, amount }: { data: Uint8ClampedArray; amount: number }): void {
	const lift = clamp01(amount) * 70;
	if (lift < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		data[index] = data[index] + (255 - data[index]) * (lift / 255);
		data[index + 1] = data[index + 1] + (255 - data[index + 1]) * (lift / 255);
		data[index + 2] = data[index + 2] + (255 - data[index + 2]) * (lift / 255);
	}
}

function applyShadows({ data, amount }: { data: Uint8ClampedArray; amount: number }): void {
	const mix = clamp01(amount);
	if (mix < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		for (let channel = 0; channel < 3; channel++) {
			const value = data[index + channel];
			const darkness = 1 - value / 255;
			data[index + channel] = value + darkness * mix * 110;
		}
	}
}

function applyHighlights({ data, amount }: { data: Uint8ClampedArray; amount: number }): void {
	const mix = clamp01(amount);
	if (mix < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		for (let channel = 0; channel < 3; channel++) {
			const value = data[index + channel];
			data[index + channel] = value - (value / 255) * mix * 90;
		}
	}
}

function applyVibrance({ data, amount }: { data: Uint8ClampedArray; amount: number }): void {
	const mix = clamp01(amount);
	if (mix < 0.001) return;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] === 0) continue;
		const r = data[index];
		const g = data[index + 1];
		const b = data[index + 2];
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const dull = 1 - (max - min) / 255;
		const gain = 1 + mix * dull * 1.6;
		const luma = lumaOf(r, g, b);
		data[index] = luma + (r - luma) * gain;
		data[index + 1] = luma + (g - luma) * gain;
		data[index + 2] = luma + (b - luma) * gain;
	}
}

/** 0 at the start and end of a transition, 1 at the midpoint. */
export function transitionPhase(progress: number): number {
	const t = Math.min(1, Math.max(0, progress));
	return t <= 0.5 ? t * 2 : (1 - t) * 2;
}

function applyTransition({
	data,
	width,
	height,
	shader,
	progress,
	amount,
	direction,
}: {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	shader: string;
	progress: number;
	amount: number;
	direction: number;
}): void {
	const phase = transitionPhase(progress) * clamp01(amount);
	if (phase < 0.001) return;
	const source = shader === "canvas:slide" || shader === "canvas:zoom" ? data.slice() : null;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4;
			if (data[index + 3] === 0 && shader !== "canvas:slide" && shader !== "canvas:zoom") {
				continue;
			}
			if (shader === "canvas:dip-black") {
				const keep = 1 - phase;
				data[index] = data[index] * keep;
				data[index + 1] = data[index + 1] * keep;
				data[index + 2] = data[index + 2] * keep;
				continue;
			}
			if (shader === "canvas:dip-white") {
				data[index] = data[index] + (255 - data[index]) * phase;
				data[index + 1] = data[index + 1] + (255 - data[index + 1]) * phase;
				data[index + 2] = data[index + 2] + (255 - data[index + 2]) * phase;
				continue;
			}
			if (shader === "canvas:wipe" && coveredByWipe({ x, y, width, height, phase, direction })) {
				data[index] = 0;
				data[index + 1] = 0;
				data[index + 2] = 0;
				continue;
			}
			if (shader === "canvas:iris") {
				const dx = (x + 0.5) / width - 0.5;
				const dy = (y + 0.5) / height - 0.5;
				const distance = Math.hypot(dx, dy) / Math.SQRT1_2;
				if (distance > 1 - phase) {
					data[index] = 0;
					data[index + 1] = 0;
					data[index + 2] = 0;
				}
				continue;
			}
			if (shader === "canvas:slide" && source) {
				const sample = slideSample({ x, y, width, height, phase, direction });
				if (!sample) {
					data[index] = 0;
					data[index + 1] = 0;
					data[index + 2] = 0;
					data[index + 3] = 255;
					continue;
				}
				const from = (sample.y * width + sample.x) * 4;
				data[index] = source[from];
				data[index + 1] = source[from + 1];
				data[index + 2] = source[from + 2];
				data[index + 3] = source[from + 3];
				continue;
			}
			if (shader === "canvas:zoom" && source) {
				const zoom = 1 + phase * 0.85;
				const sx = Math.round((x + 0.5 - width / 2) / zoom + width / 2 - 0.5);
				const sy = Math.round((y + 0.5 - height / 2) / zoom + height / 2 - 0.5);
				if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
					data[index] = 0;
					data[index + 1] = 0;
					data[index + 2] = 0;
					continue;
				}
				const from = (sy * width + sx) * 4;
				data[index] = source[from];
				data[index + 1] = source[from + 1];
				data[index + 2] = source[from + 2];
				data[index + 3] = source[from + 3];
			}
		}
	}
}

function coveredByWipe({
	x,
	y,
	width,
	height,
	phase,
	direction,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
	phase: number;
	direction: number;
}): boolean {
	if (direction === 1) return x / width > 1 - phase;
	if (direction === 2) return y / height < phase;
	if (direction === 3) return y / height > 1 - phase;
	return x / width < phase;
}

function slideSample({
	x,
	y,
	width,
	height,
	phase,
	direction,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
	phase: number;
	direction: number;
}): { x: number; y: number } | null {
	const shiftX = direction === 1 ? -Math.round(phase * width) : direction === 0 ? Math.round(phase * width) : 0;
	const shiftY = direction === 2 ? Math.round(phase * height) : direction === 3 ? -Math.round(phase * height) : 0;
	const sx = x + shiftX;
	const sy = y + shiftY;
	if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;
	return { x: sx, y: sy };
}

function grainUnit(x: number, y: number, seed: number): number {
	let n =
		Math.imul(x + 1, 374761393) ^
		Math.imul(y + 1, 668265263) ^
		Math.imul(seed | 0, 1442695041);
	n = Math.imul(n ^ (n >>> 13), 1274126177);
	n = n ^ (n >>> 16);
	return (n >>> 0) / 4294967296;
}

function lumaOf(r: number, g: number, b: number): number {
	return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
	const t = clamp01((value - edge0) / (edge1 - edge0));
	return t * t * (3 - 2 * t);
}
