import { scroEmbedParentOrigin } from "@/opencut/embed/scro-embed-parent";
import { sendToScro } from "@/opencut/embed/scro-transport";
import type { FramePosition } from "@/model/project";

export type ScroClipMenuAction = "remaining" | "scenes" | "clips" | "add";

/** Ask the Scro host to open a clip toolbar action (finish, frames, videos, add, delete). */
export function requestScroClipMenu({
	videoId,
	action,
}: {
	videoId: string;
	action: ScroClipMenuAction;
}) {
	const origin = scroEmbedParentOrigin() ?? window.location.origin;
	sendToScro({ type: "scro-clip-menu", videoId, action }, origin);
}

/** Ask the Scro host to run a clip production action. */
export function requestScroClipAction({
	videoId,
	clipNumber,
	action,
}: {
	videoId: string;
	clipNumber: number;
	action: "generate-frames" | "generate-video" | "cancel-video";
}) {
	const origin = scroEmbedParentOrigin() ?? window.location.origin;
	sendToScro(
		{ type: "scro-clip-action", videoId, clipNumber, action },
		origin,
	);
}

/** Ask the Scro host to rewrite this clip from one instruction. */
export function requestScroSceneEdit({
	videoId,
	clipNumber,
	message,
	requestId,
}: {
	videoId: string;
	clipNumber: number;
	message: string;
	requestId: string;
}) {
	const origin = scroEmbedParentOrigin() ?? window.location.origin;
	sendToScro(
		{ type: "scro-scene-edit", videoId, clipNumber, message, requestId },
		origin,
	);
}

/** Ask the Scro host to open FrameEdit. */
export function requestScroOpenAi({
	videoId,
	clipNumber,
	kind,
	position,
}: {
	videoId: string;
	clipNumber: number;
	kind: "scene-chat" | "frame-edit";
	position?: FramePosition;
}) {
	const origin = scroEmbedParentOrigin() ?? window.location.origin;
	sendToScro(
		{
			type: "scro-open-ai",
			videoId,
			clipNumber,
			kind,
			position,
		},
		origin,
	);
}
