"use client";

import type { InFlightCounts } from "@/service/clip-stage";
import { useI18n } from "@/presentation/components/i18n-provider";

/** Compact in-flight queue summary for the Scro Video toolbar. */
export function ScroVideoQueue({
	framesQueued,
	framesGenerating,
	videosQueued,
	videosGenerating,
	clipsQueued = 0,
	clipsWriting = 0,
	clipsFailed = 0,
	onOpen,
}: InFlightCounts & {
	clipsQueued?: number;
	clipsWriting?: number;
	clipsFailed?: number;
	onOpen: () => void;
}) {
	const { t } = useI18n();
	const frames = framesQueued + framesGenerating;
	const videos = videosQueued + videosGenerating;
	const clips = clipsQueued + clipsWriting;
	if (frames === 0 && videos === 0 && clips === 0 && clipsFailed === 0) return null;

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
			{clips > 0 ? (
				<span>
					{t("production.filmstrip.addQueue")}{" "}
					<span className="tabular-nums">
						{clipsQueued > 0 ? t("production.filmstrip.addQueueQueued", { n: clipsQueued }) : ""}
						{clipsQueued > 0 && clipsWriting > 0 ? " · " : ""}
						{clipsWriting > 0 ? t("production.filmstrip.addQueueWriting", { n: clipsWriting }) : ""}
					</span>
				</span>
			) : null}
			{clipsFailed > 0 ? (
				<span>{t("production.filmstrip.addQueueFailed", { n: clipsFailed })}</span>
			) : null}
		</button>
	);
}
