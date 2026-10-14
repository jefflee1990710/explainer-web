import { scroEmbedParentOrigin } from "@/opencut/embed/scro-embed-parent";
import { sendToScro } from "@/opencut/embed/scro-transport";
import type { FramePosition } from "@/model/project";

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

/** Ask the Scro host to open SceneChat or FrameEdit. */
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
