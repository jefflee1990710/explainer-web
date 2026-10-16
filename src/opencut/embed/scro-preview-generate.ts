import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

/** Start still is on screen and this clip has no video yet. */
export function scroPreviewCanStartVideo(
	clip?: Pick<
		ScroVideoSeedClip,
		"stage" | "posterUrl" | "hasStartFrame" | "videoUrl"
	> | null,
) {
	if (!clip || clip.videoUrl) return false;
	if (clip.stage !== "frames_ready") return false;
	return Boolean(clip.posterUrl || clip.hasStartFrame);
}
