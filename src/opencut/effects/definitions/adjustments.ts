import type { ParamValues } from "@/opencut/params";
import type { EffectCategory, EffectDefinition, EffectPass } from "@/opencut/effects/types";

type SliderSpec = {
	type: string;
	name: string;
	keywords: string[];
	shader: string;
	label: string;
	min: number;
	max: number;
	step: number;
	defaultValue: number;
	/** Slider position that leaves the picture unchanged. */
	identity: number;
	category: EffectCategory;
	preview: string;
};

const LOOKS: SliderSpec[] = [
	{
		type: "grayscale",
		name: "Grayscale",
		keywords: ["grayscale", "black", "white", "mono"],
		shader: "canvas:grayscale",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		identity: 0,
		category: "effect",
		preview: "The same photo converted to black and white. No color remains.",
	},
	{
		type: "sepia",
		name: "Sepia",
		keywords: ["sepia", "vintage", "brown"],
		shader: "canvas:sepia",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		identity: 0,
		category: "effect",
		preview: "The same photo with a warm sepia tone, like an old brown photograph.",
	},
	{
		type: "invert",
		name: "Invert",
		keywords: ["invert", "negative"],
		shader: "canvas:invert",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		identity: 0,
		category: "effect",
		preview: "The same photo as a photographic negative, with colors inverted.",
	},
	{
		type: "vignette",
		name: "Vignette",
		keywords: ["vignette", "dark", "edges"],
		shader: "canvas:vignette",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 75,
		identity: 0,
		category: "effect",
		preview: "The same photo with heavy dark corners and a bright center.",
	},
	{
		type: "pixelate",
		name: "Pixelate",
		keywords: ["pixelate", "mosaic", "blocks"],
		shader: "canvas:pixelate",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 40,
		identity: 0,
		category: "effect",
		preview: "Turn the photo into chunky pixel art. The frame is only about 24 big squares across. Each square is one flat color. No fine detail, no smooth skin, no sharp edges.",
	},
	{
		type: "grain",
		name: "Grain",
		keywords: ["grain", "noise", "film"],
		shader: "canvas:grain",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 45,
		identity: 0,
		category: "effect",
		preview: "The same photo covered in heavy film grain and noise.",
	},
];

const ADJUSTMENTS: SliderSpec[] = [
	{
		type: "brightness",
		name: "Brightness",
		keywords: ["brightness", "exposure", "light"],
		shader: "canvas:brightness",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 65,
		identity: 50,
		category: "adjustment",
		preview: "The same photo, clearly brighter, as if the exposure was raised. Do not blow the face out to pure white.",
	},
	{
		type: "contrast",
		name: "Contrast",
		keywords: ["contrast", "punch"],
		shader: "canvas:contrast",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 70,
		identity: 50,
		category: "adjustment",
		preview: "The same photo with much stronger contrast, deeper shadows and brighter highlights.",
	},
	{
		type: "saturation",
		name: "Saturation",
		keywords: ["saturation", "color", "vivid"],
		shader: "canvas:saturation",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		identity: 50,
		category: "adjustment",
		preview: "The same photo with extremely vivid, saturated colors.",
	},
	{
		type: "warmth",
		name: "Warmth",
		keywords: ["warmth", "temperature", "cool", "warm"],
		shader: "canvas:warmth",
		label: "Warmth",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 80,
		identity: 50,
		category: "adjustment",
		preview: "The same photo with a warm golden color grade, more orange and less blue.",
	},
	{
		type: "hue",
		name: "Hue",
		keywords: ["hue", "color", "rotate"],
		shader: "canvas:hue",
		label: "Degrees",
		min: 0,
		max: 360,
		step: 1,
		defaultValue: 40,
		identity: 0,
		category: "adjustment",
		preview: "The same photo with the colors rotated: the sky leans purple and the skin leans slightly green.",
	},
	{
		type: "sharpen",
		name: "Sharpen",
		keywords: ["sharpen", "crisp", "detail"],
		shader: "canvas:sharpen",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 60,
		identity: 0,
		category: "adjustment",
		preview: "The same photo looking extra crisp, with sharper edges on the face, hair, and clothes.",
	},
	{
		type: "fade",
		name: "Fade",
		keywords: ["fade", "wash", "film", "lift"],
		shader: "canvas:fade",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 55,
		identity: 0,
		category: "adjustment",
		preview: "The same photo with a milky film fade: blacks are lifted and the picture looks washed.",
	},
	{
		type: "shadows",
		name: "Shadows",
		keywords: ["shadows", "lift", "dark"],
		shader: "canvas:shadows",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 60,
		identity: 0,
		category: "adjustment",
		preview: "The same photo with the dark shadows opened up, so the shaded areas are much brighter.",
	},
	{
		type: "highlights",
		name: "Highlights",
		keywords: ["highlights", "sky", "bright"],
		shader: "canvas:highlights",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 60,
		identity: 0,
		category: "adjustment",
		preview: "The same photo with the bright highlights pulled down, especially the sky and skin highlights.",
	},
	{
		type: "vibrance",
		name: "Vibrance",
		keywords: ["vibrance", "color", "pop"],
		shader: "canvas:vibrance",
		label: "Amount",
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 70,
		identity: 0,
		category: "adjustment",
		preview: "The same photo with dull colors popped, while skin stays natural.",
	},
];

function readAmount(params: ParamValues, fallback: number): number {
	const raw = params.amount;
	const value = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
	return Number.isFinite(value) ? value : fallback;
}

function isIdentityAmount({ spec, value }: { spec: SliderSpec; value: number }): boolean {
	if (spec.type === "hue") {
		const turns = ((value % 360) + 360) % 360;
		return turns < 0.001 || turns > 359.999;
	}
	return Math.abs(value - spec.identity) < 0.001;
}

function passesFor({
	spec,
	effectParams,
}: {
	spec: SliderSpec;
	effectParams: ParamValues;
}): EffectPass[] {
	const amount = readAmount(effectParams, spec.defaultValue);
	if (isIdentityAmount({ spec, value: amount })) return [];
	return [
		{
			shader: spec.shader,
			uniforms: {
				u_amount: amount,
				...(spec.shader === "canvas:grain"
					? { u_seed: Math.floor(Math.random() * 1_000_000) }
					: {}),
			},
		},
	];
}

function sliderEffect(spec: SliderSpec): EffectDefinition {
	return {
		type: spec.type,
		name: spec.name,
		keywords: spec.keywords,
		category: spec.category,
		preview: spec.preview,
		params: [
			{
				key: "amount",
				label: spec.label,
				type: "number",
				default: spec.defaultValue,
				min: spec.min,
				max: spec.max,
				step: spec.step,
			},
		],
		renderer: {
			passes: [
				{
					shader: spec.shader,
					uniforms: ({ effectParams }) =>
						passesFor({ spec, effectParams })[0]?.uniforms ?? {
							u_amount: spec.identity,
						},
				},
			],
			buildPasses: ({ effectParams }) => passesFor({ spec, effectParams }),
		},
	};
}

export const lookEffectDefinitions: EffectDefinition[] = LOOKS.map(sliderEffect);
export const adjustmentEffectDefinitions: EffectDefinition[] = ADJUSTMENTS.map(sliderEffect);
