import type { MaskableElement, VisualElement } from "./types";
import type { ParamValues } from "@/opencut/params";

interface BaseDragData {
	id: string;
	name: string;
}

export interface MediaDragData extends BaseDragData {
	type: "media";
	mediaType: "image" | "video" | "audio";
	targetElementTypes?: MaskableElement["type"][];
	/** Opening / Ending sting. Land on the main video track instead of replacing a clip. */
	placeOnMainTrack?: boolean;
	/** Used when the sting has not finished downloading into the media library yet. */
	bookend?: {
		url: string;
		posterUrl?: string;
		editorVideoId: string;
		role?: "opening" | "ending";
		durationSeconds?: number;
	};
}

export interface TextDragData extends BaseDragData {
	type: "text";
	content: string;
	fontFamily?: string;
	fontWeight?: string;
}

export interface StickerDragData extends BaseDragData {
	type: "sticker";
	stickerId: string;
}

export interface GraphicDragData extends BaseDragData {
	type: "graphic";
	definitionId: string;
	params: Partial<ParamValues>;
}

export interface EffectDragData extends BaseDragData {
	type: "effect";
	effectType: string;
	targetElementTypes: VisualElement["type"][];
	/** "edge" accepts a drop only on a clip head, tail, or the cut between clips. */
	placement?: "anywhere" | "edge";
}

export type TimelineDragData =
	| MediaDragData
	| TextDragData
	| StickerDragData
	| GraphicDragData
	| EffectDragData;
