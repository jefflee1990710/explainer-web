"use client";

import { MediaLoadingMark } from "@/opencut/components/loading-media-image";
import { useEditor } from "@/opencut/editor/use-editor";
import { requestScroOpenAi } from "@/opencut/embed/scro-video-actions";
import { scroStartStillPending } from "@/opencut/embed/scro-video-assets";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

/** Redraw stills. Clip text edits use the sticky input under the panel. */
export function ScroVideoAiEntry({
	videoId,
	clip,
}: {
	videoId: string;
	clip: ScroVideoSeedClip;
}) {
	const canvas = useEditor((state) => state.project.getActiveOrNull()?.settings.canvasSize);
	const aspectRatio =
		canvas && canvas.width > 1 && canvas.height > 1
			? `${canvas.width} / ${canvas.height}`
			: "16 / 9";
	// Talking-head: the video ends on the next clip's start, so the end tile edits that still.
	const endClipNumber = clip.endFromClipNumber ?? clip.clipNumber;
	const endPosition = clip.endFromClipNumber ? "start" : "end";

	return (
		<div className="space-y-2">
			<div className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
				Edit
			</div>
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					disabled={!clip.hasStartFrame && !clip.posterUrl}
					onClick={() =>
						requestScroOpenAi({
							videoId,
							clipNumber: clip.clipNumber,
							kind: "frame-edit",
							position: "start",
						})
					}
					className="border-border bg-accent/40 hover:bg-accent disabled:opacity-40 flex flex-col overflow-hidden rounded-sm border text-left"
				>
					<div
						className="bg-muted relative w-full overflow-hidden"
						style={{ aspectRatio }}
					>
						{scroStartStillPending(clip) ? (
							<MediaLoadingMark />
						) : clip.posterUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={clip.posterUrl} alt="" className="size-full object-cover" />
						) : (
							<div className="text-muted-foreground grid size-full place-items-center text-[0.65rem]">
								Start
							</div>
						)}
					</div>
					<span className="px-1.5 py-1 text-[0.65rem]">Redraw start</span>
				</button>
				<button
					type="button"
					disabled={!clip.hasEndFrame && !clip.endPosterUrl}
					onClick={() =>
						requestScroOpenAi({
							videoId,
							clipNumber: endClipNumber,
							kind: "frame-edit",
							position: endPosition,
						})
					}
					className="border-border bg-accent/40 hover:bg-accent disabled:opacity-40 flex flex-col overflow-hidden rounded-sm border text-left"
				>
					<div
						className="bg-muted relative w-full overflow-hidden"
						style={{ aspectRatio }}
					>
						{clip.endPending ? (
							<MediaLoadingMark />
						) : clip.endPosterUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={clip.endPosterUrl} alt="" className="size-full object-cover" />
						) : (
							<div className="text-muted-foreground grid size-full place-items-center text-[0.65rem]">
								End
							</div>
						)}
					</div>
					<span className="px-1.5 py-1 text-[0.65rem]">
						{clip.endFromClipNumber
							? `Redraw end · Clip ${clip.endFromClipNumber} start`
							: "Redraw end"}
					</span>
				</button>
			</div>
		</div>
	);
}
