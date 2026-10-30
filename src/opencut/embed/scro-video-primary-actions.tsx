"use client";

import { Button } from "@/opencut/components/ui/button";
import { scroClipPrimaryKind } from "@/opencut/embed/scro-preview-generate";
import { requestScroClipAction } from "@/opencut/embed/scro-video-actions";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

/** Stage-dependent generate / cancel buttons for a Scro clip. */
export function ScroVideoPrimaryActions({
	videoId,
	clip,
}: {
	videoId: string;
	clip: ScroVideoSeedClip;
}) {
	const { oc } = useOpencutI18n();
	const busy =
		clip.stage === "frames_generating" || clip.stage === "video_generating";
	const canCancel = Boolean(clip.videoUnsent && clip.stage === "video_generating");
	const primary = scroClipPrimaryKind(clip);
	const needsFrames = primary === "frames";
	const canVideo = primary === "video";
	const showRedraw =
		Boolean(clip.hasStartFrame) &&
		clip.stage !== "awaiting_frames" &&
		clip.stage !== "frames_generating";

	const framesLabel = clip.hasStartFrame
		? oc.inspector.redrawFrames(clip.frameCost)
		: oc.inspector.generateFrames(clip.frameCost);
	const againVideo = clip.stage === "video_ready" || clip.staleVideo || clip.retryVideo;
	const videoLabel = againVideo
		? oc.inspector.regenerateVideo(clip.videoCost)
		: oc.inspector.generateVideo(clip.videoCost);

	return (
		<div className="space-y-2">
			{showRedraw && !needsFrames ? (
				<Button
					variant="ghost"
					size="sm"
					className="w-full"
					disabled={busy}
					onClick={() =>
						requestScroClipAction({
							videoId,
							clipNumber: clip.clipNumber,
							action: "generate-frames",
						})
					}
				>
					{framesLabel}
				</Button>
			) : null}
			{canCancel ? (
				<Button
					variant="secondary"
					size="sm"
					className="w-full"
					onClick={() =>
						requestScroClipAction({
							videoId,
							clipNumber: clip.clipNumber,
							action: "cancel-video",
						})
					}
				>
					{oc.inspector.cancelQueuedVideo}
				</Button>
			) : needsFrames ? (
				<Button
					size="sm"
					className="w-full"
					disabled={busy}
					onClick={() =>
						requestScroClipAction({
							videoId,
							clipNumber: clip.clipNumber,
							action: "generate-frames",
						})
					}
				>
					{busy && clip.stage === "frames_generating" ? oc.inspector.drawing : framesLabel}
				</Button>
			) : canVideo ? (
				<Button
					size="sm"
					className="w-full"
					disabled={busy}
					onClick={() =>
						requestScroClipAction({
							videoId,
							clipNumber: clip.clipNumber,
							action: "generate-video",
						})
					}
				>
					{busy && clip.stage === "video_generating" ? oc.inspector.rendering : videoLabel}
				</Button>
			) : busy ? (
				<p className="text-muted-foreground text-xs">
					{clip.stage === "frames_generating"
						? oc.inspector.drawingFrames
						: oc.inspector.renderingVideo}
					{clip.wait ? ` (${clip.wait})` : ""}
				</p>
			) : null}
			{clip.error ? (
				<p role="alert" className="text-destructive text-xs">
					{clip.error}
				</p>
			) : null}
		</div>
	);
}
