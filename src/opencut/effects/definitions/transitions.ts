import type { ParamValues } from "@/opencut/params";
import type { EffectDefinition, EffectPass } from "@/opencut/effects/types";
import { buildGaussianBlurPasses, intensityToSigma } from "./blur";

type TransitionSpec = {
	type: string;
	name: string;
	keywords: string[];
	shader: string;
	direction: number;
	preview: string;
	/** Uses the GPU blur instead of a canvas shader. */
	blur?: boolean;
};

const TRANSITIONS: TransitionSpec[] = [
	{
		type: "dip",
		name: "Fade",
		keywords: ["fade", "dip", "black", "transition"],
		shader: "canvas:dip-black",
		direction: 0,
		preview: "The same photo fading to black, about halfway gone, as a video fade transition.",
	},
	{
		type: "flash",
		name: "Flash",
		keywords: ["flash", "white", "transition"],
		shader: "canvas:dip-white",
		direction: 0,
		preview: "The same photo flashing toward white, about halfway washed out, as a white flash transition.",
	},
	{
		type: "wipe",
		name: "Wipe Left",
		keywords: ["wipe", "left", "transition"],
		shader: "canvas:wipe",
		direction: 0,
		preview: "A hard wipe: the left half of the frame is solid black and the right half is the same photo, split by a straight vertical edge.",
	},
	{
		type: "wipe-right",
		name: "Wipe Right",
		keywords: ["wipe", "right", "transition"],
		shader: "canvas:wipe",
		direction: 1,
		preview: "A hard wipe: the right half of the frame is solid black and the left half is the same photo, split by a straight vertical edge.",
	},
	{
		type: "wipe-up",
		name: "Wipe Up",
		keywords: ["wipe", "up", "transition"],
		shader: "canvas:wipe",
		direction: 2,
		preview: "A hard wipe: the top half of the frame is solid black and the bottom half is the same photo, split by a straight horizontal edge.",
	},
	{
		type: "wipe-down",
		name: "Wipe Down",
		keywords: ["wipe", "down", "transition"],
		shader: "canvas:wipe",
		direction: 3,
		preview: "A hard wipe: the bottom half of the frame is solid black and the top half is the same photo, split by a straight horizontal edge.",
	},
	{
		type: "iris",
		name: "Circle",
		keywords: ["circle", "iris", "transition"],
		shader: "canvas:iris",
		direction: 0,
		preview: "A circular iris: the person is visible inside a round window and everything outside the circle is solid black.",
	},
	{
		type: "iris-open",
		name: "Circle Open",
		keywords: ["circle", "iris", "open", "transition"],
		shader: "canvas:iris-open",
		direction: 0,
		preview: "A circle of solid black opening from the center of the same photo.",
	},
	{
		type: "slide",
		name: "Slide",
		keywords: ["slide", "push", "left", "transition"],
		shader: "canvas:slide",
		direction: 0,
		preview: "The same photo slid halfway off the left edge, with the empty right side solid black.",
	},
	{
		type: "slide-right",
		name: "Slide Right",
		keywords: ["slide", "right", "transition"],
		shader: "canvas:slide",
		direction: 1,
		preview: "The same photo slid halfway off the right edge, with the empty left side solid black.",
	},
	{
		type: "slide-up",
		name: "Slide Up",
		keywords: ["slide", "up", "transition"],
		shader: "canvas:slide",
		direction: 2,
		preview: "The same photo slid halfway off the top edge, with the empty bottom solid black.",
	},
	{
		type: "slide-down",
		name: "Slide Down",
		keywords: ["slide", "down", "transition"],
		shader: "canvas:slide",
		direction: 3,
		preview: "The same photo slid halfway off the bottom edge, with the empty top solid black.",
	},
	{
		type: "zoom",
		name: "Zoom",
		keywords: ["zoom", "punch", "transition"],
		shader: "canvas:zoom",
		direction: 0,
		preview: "A tight zoom into the person's face from the same photo, as if the camera punched in.",
	},
	{
		type: "clock",
		name: "Clock",
		keywords: ["clock", "radial", "wipe", "transition"],
		shader: "canvas:clock",
		direction: 0,
		preview: "A clock wipe: solid black sweeps clockwise from the top across the same photo.",
	},
	{
		type: "barn",
		name: "Barn Door",
		keywords: ["barn", "door", "split", "transition"],
		shader: "canvas:barn",
		direction: 0,
		preview: "Black bars closing in from the left and right edges over the same photo.",
	},
	{
		type: "dissolve",
		name: "Dissolve",
		keywords: ["dissolve", "pixel", "transition"],
		shader: "canvas:dissolve",
		direction: 0,
		preview: "The same photo breaking into scattered black pixels, halfway through a dissolve.",
	},
	{
		type: "blur-in",
		name: "Blur",
		keywords: ["blur", "defocus", "transition"],
		shader: "gaussian-blur",
		direction: 0,
		blur: true,
		preview: "The same photo heavily defocused, as the middle of a blur transition.",
	},
];

function readNumber(params: ParamValues, key: string, fallback: number): number {
	const raw = params[key];
	const value = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
	return Number.isFinite(value) ? value : fallback;
}

/** 0 at both ends of the clip, 1 in the middle, scaled by Amount. */
export function transitionStrength(params: ParamValues): number {
	const progress = Math.min(1, Math.max(0, readNumber(params, "progress", 0)));
	const amount = readNumber(params, "amount", 100) / 100;
	const envelope = progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
	return Math.min(1, Math.max(0, envelope * amount));
}

function passesFor({
	spec,
	effectParams,
	width,
	height,
}: {
	spec: TransitionSpec;
	effectParams: ParamValues;
	width: number;
	height: number;
}): EffectPass[] {
	const strength = transitionStrength(effectParams);
	if (strength < 0.001) return [];
	if (spec.blur) {
		const intensity = strength * 80;
		return buildGaussianBlurPasses({
			sigmaX: intensityToSigma({ intensity, resolution: width, reference: 1920 }),
			sigmaY: intensityToSigma({ intensity, resolution: height, reference: 1080 }),
		});
	}
	return [
		{
			shader: spec.shader,
			uniforms: {
				u_progress: readNumber(effectParams, "progress", 0),
				u_amount: readNumber(effectParams, "amount", 100),
				u_direction: spec.direction,
			},
		},
	];
}

function transitionEffect(spec: TransitionSpec): EffectDefinition {
	return {
		type: spec.type,
		name: spec.name,
		keywords: spec.keywords,
		category: "transition",
		preview: spec.preview,
		params: [
			{
				key: "amount",
				label: "Amount",
				type: "number",
				default: 100,
				min: 0,
				max: 100,
				step: 1,
			},
		],
		renderer: {
			passes: [
				{
					shader: spec.shader,
					uniforms: ({ effectParams }) => ({
						u_progress: readNumber(effectParams, "progress", 0),
						u_amount: readNumber(effectParams, "amount", 100),
						u_direction: spec.direction,
					}),
				},
			],
			buildPasses: ({ effectParams, width, height }) =>
				passesFor({ spec, effectParams, width, height }),
		},
	};
}

export const transitionEffectDefinitions: EffectDefinition[] =
	TRANSITIONS.map(transitionEffect);
