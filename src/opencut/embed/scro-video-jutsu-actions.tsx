"use client";

import { Button } from "@/opencut/components/ui/button";
import { requestScroOpenAi } from "@/opencut/embed/scro-video-actions";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";

/** True only when the storyboard clip has a finished video URL ready to transform. */
export function canApplyClipJutsu(
	clip: Pick<ScroVideoSeedClip, "stage" | "videoUrl"> | null | undefined,
): boolean {
	if (!clip) return false;
	return clip.stage === "video_ready" && Boolean(clip.videoUrl?.trim());
}

/** Inspector buttons to open Scro Swap or Teleport for a completed storyboard clip. */
export function ScroVideoJutsuActions({
	videoId,
	clip,
}: {
	videoId: string;
	clip: ScroVideoSeedClip;
}) {
	const { oc } = useOpencutI18n();
	if (!canApplyClipJutsu(clip)) return null;

	return (
		<div className="space-y-1.5">
			<div className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
				{oc.inspector.relocateOrSwap}
			</div>
			<div className="grid grid-cols-2 gap-2">
				<Button
					type="button"
					variant="secondary"
					size="sm"
					className="w-full text-xs"
					onClick={() =>
						requestScroOpenAi({
							videoId,
							clipNumber: clip.clipNumber,
							kind: "scro-swap",
						})
					}
				>
					{oc.inspector.scroSwap}
				</Button>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					className="w-full text-xs"
					onClick={() =>
						requestScroOpenAi({
							videoId,
							clipNumber: clip.clipNumber,
							kind: "teleport",
						})
					}
				>
					{oc.inspector.teleport}
				</Button>
			</div>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				className="w-full text-xs"
				onClick={() =>
					requestScroOpenAi({
						videoId,
						clipNumber: clip.clipNumber,
						kind: "extend-video",
					})
				}
			>
				{oc.inspector.extendVideo}
			</Button>
		</div>
	);
}
