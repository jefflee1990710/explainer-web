"use client";

import type { InFlightCounts } from "@/service/clip-stage";

/** Compact in-flight queue summary for the Scro Video toolbar. */
export function ScroVideoQueue({
	framesQueued,
	framesGenerating,
	videosQueued,
	videosGenerating,
	onOpen,
}: InFlightCounts & { onOpen: () => void }) {
	const frames = framesQueued + framesGenerating;
	const videos = videosQueued + videosGenerating;
	if (frames === 0 && videos === 0) return null;

	return (
		<button
			type="button"
			onClick={onOpen}
			className="text-muted-foreground hover:text-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs underline-offset-2 hover:underline"
		>
			{frames > 0 ? (
				<span>
					Stills{" "}
					<span className="tabular-nums">
						{framesQueued > 0 ? `${framesQueued} queued` : ""}
						{framesQueued > 0 && framesGenerating > 0 ? " · " : ""}
						{framesGenerating > 0 ? `${framesGenerating} running` : ""}
					</span>
				</span>
			) : null}
			{videos > 0 ? (
				<span>
					Videos{" "}
					<span className="tabular-nums">
						{videosQueued > 0 ? `${videosQueued} queued` : ""}
						{videosQueued > 0 && videosGenerating > 0 ? " · " : ""}
						{videosGenerating > 0 ? `${videosGenerating} running` : ""}
					</span>
				</span>
			) : null}
		</button>
	);
}
