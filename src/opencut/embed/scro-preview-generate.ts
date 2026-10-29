import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

type ScroClipActionClip = Pick<
	ScroVideoSeedClip,
	| "stage"
	| "posterUrl"
	| "hasStartFrame"
	| "videoUrl"
	| "staleFrames"
	| "staleVideo"
	| "retryVideo"
	| "videoCost"
>;

/** A failed video can be sent again while its stills are still current. */
export function scroClipCanRetryVideo(
	clip?: Pick<ScroVideoSeedClip, "retryVideo" | "staleFrames"> | null,
) {
	return Boolean(clip?.retryVideo) && !clip?.staleFrames;
}

/** Black inspector button: redraw stills, or render / retry the video. */
export function scroClipPrimaryKind(
	clip: Pick<
		ScroVideoSeedClip,
		"stage" | "hasStartFrame" | "staleFrames" | "staleVideo" | "retryVideo"
	>,
): "frames" | "video" | "none" {
	const retryVideo = scroClipCanRetryVideo(clip);
	const needsFrames =
		clip.stage === "awaiting_frames" ||
		(clip.stage === "failed" && !retryVideo) ||
		Boolean(clip.staleFrames) ||
		(!clip.hasStartFrame && clip.stage !== "video_ready");
	if (needsFrames) return "frames";
	const canVideo =
		clip.stage === "frames_ready" ||
		clip.stage === "video_ready" ||
		retryVideo ||
		Boolean(clip.staleVideo);
	return canVideo ? "video" : "none";
}

export function scroVideoActionLabel(
	clip: Pick<ScroVideoSeedClip, "stage" | "staleVideo" | "retryVideo" | "videoCost">,
) {
	const again = clip.stage === "video_ready" || clip.staleVideo || clip.retryVideo;
	const name = again ? "Regenerate video" : "Generate video";
	return clip.videoCost ? `${name} · ${clip.videoCost}` : name;
}

/** Start still is on screen and this clip can take a video, including a failed retry. */
export function scroPreviewCanStartVideo(clip?: ScroClipActionClip | null) {
	if (!clip || clip.videoUrl || clip.staleFrames) return false;
	if (clip.stage !== "frames_ready" && !clip.retryVideo) return false;
	return Boolean(clip.posterUrl || clip.hasStartFrame);
}

/** True while a clip's video (or frames) is actively generating on the timeline / preview. */
export function scroClipIsGeneratingVideo(
	clip?: Pick<ScroVideoSeedClip, "stage" | "wait"> | null,
): boolean {
	if (!clip) return false;
	return clip.stage === "video_generating";
}

/** Human-readable status label for a clip whose video is currently generating. */
export function scroVideoGeneratingLabel(
	clip?: Pick<ScroVideoSeedClip, "stage" | "wait"> | null,
): string {
	if (!clip) return "Generating video…";
	if (clip.wait === "queued") return "Queued video…";
	return "Generating video…";
}
