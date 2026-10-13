export const EDITOR_PREVIEW_VERSION = "1";

export const EDITOR_PREVIEW_SOURCE_PROMPT = [
	"A square photorealistic photograph of one young woman standing on a sunny city sidewalk.",
	"Three-quarter length, black floral dress, brown shoulder bag, soft daylight, blue sky with light clouds.",
	"Her face is sharp and clearly visible. Natural colors, empty background aside from the street and sky.",
	"No text, no watermark, no collage, no extra people.",
].join(" ");

export function editorPreviewEditPrompt(preview: string): string {
	return [
		"Edit the attached photograph.",
		"Keep the same person, pose, clothes, background, and framing.",
		preview,
		"A real photograph, not a drawing.",
		"No text, no watermark, no collage, no extra people.",
	].join(" ");
}

export function editorPreviewSrc({
	category,
	type,
}: {
	category: string;
	type: string;
}): string {
	return `/editor-previews/${category}-${type}.webp?v=${EDITOR_PREVIEW_VERSION}`;
}
