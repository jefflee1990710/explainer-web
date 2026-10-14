import type { TProjectSettings } from "@/opencut/project/types";

export type ScroAspectRatio = "9:16" | "16:9" | "1:1";

// Storyboard frame. Must stay larger than the 1×1 still stand-in.
export const SCRO_CANVAS_SIZE: Record<
	ScroAspectRatio,
	{ width: number; height: number }
> = {
	"9:16": { width: 1080, height: 1920 },
	"16:9": { width: 1920, height: 1080 },
	"1:1": { width: 1080, height: 1080 },
};

type CanvasEditor = {
	project: {
		getActiveOrNull: () => { settings: TProjectSettings } | null;
		updateSettings: (args: {
			settings: Partial<TProjectSettings>;
			pushHistory?: boolean;
		}) => Promise<void>;
	};
};

export function scroCanvasSize(aspectRatio?: string | null) {
	if (!aspectRatio) return null;
	return SCRO_CANVAS_SIZE[aspectRatio as ScroAspectRatio] ?? null;
}

function isStandInSize(size?: { width: number; height: number } | null) {
	return !size || size.width <= 1 || size.height <= 1;
}

// Put the preview back on the brief's aspect. The first waiting still is a
// 1×1 image, and inserting it would otherwise shrink the whole canvas to that pixel.
export async function applyScroCanvasSize(
	editor: CanvasEditor,
	aspectRatio?: string | null,
) {
	const size = scroCanvasSize(aspectRatio);
	if (!size) return;
	const settings = editor.project.getActiveOrNull()?.settings;
	if (!settings) return;
	const canvasMatches =
		settings.canvasSize?.width === size.width &&
		settings.canvasSize?.height === size.height;
	const originalIsStandIn = isStandInSize(settings.originalCanvasSize);
	if (canvasMatches && !originalIsStandIn) return;
	await editor.project.updateSettings({
		settings: {
			...(canvasMatches
				? {}
				: { canvasSize: size, canvasSizeMode: "preset" as const }),
			...(originalIsStandIn ? { originalCanvasSize: size } : {}),
		},
		pushHistory: false,
	});
}
