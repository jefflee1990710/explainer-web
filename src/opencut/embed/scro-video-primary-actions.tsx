"use client";

import { Button } from "@/opencut/components/ui/button";
import { scroClipPrimaryKind, scroVideoActionLabel } from "@/opencut/embed/scro-preview-generate";
import { requestScroClipAction } from "@/opencut/embed/scro-video-actions";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

/** Stage-dependent generate / cancel buttons for a Scro clip. */
export function ScroVideoPrimaryActions({
	videoId,
	clip,
}: {
	videoId: string;
	clip: ScroVideoSeedClip;
}) {
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
		? `Redraw frames${clip.frameCost ? ` · ${clip.frameCost}` : ""}`
		: `Generate frames${clip.frameCost ? ` · ${clip.frameCost}` : ""}`;
	const videoLabel = scroVideoActionLabel(clip);

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
					Cancel queued video
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
					{busy && clip.stage === "frames_generating" ? "Drawing…" : framesLabel}
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
					{busy && clip.stage === "video_generating" ? "Rendering…" : videoLabel}
				</Button>
			) : busy ? (
				<p className="text-muted-foreground text-xs">
					{clip.stage === "frames_generating" ? "Drawing frames…" : "Rendering video…"}
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
