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
		type: "iris",
		name: "Circle",
		keywords: ["circle", "iris", "transition"],
		shader: "canvas:iris",
		direction: 0,
		preview: "A circular iris: the person is visible inside a round window and everything outside the circle is solid black.",
	},
	{
		type: "slide",
		name: "Slide",
		keywords: ["slide", "push", "transition"],
		shader: "canvas:slide",
		direction: 0,
		preview: "The same photo slid halfway off the left edge, with the empty right side solid black.",
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
