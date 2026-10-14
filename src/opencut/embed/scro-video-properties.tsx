"use client";

import { ScroClipTextField } from "@/opencut/embed/scro-clip-text-field";
import { ScroSceneEditInput } from "@/opencut/embed/scro-scene-edit-input";
import { ScroVideoAiEntry } from "@/opencut/embed/scro-video-ai-entry";
import { ScroVideoPrimaryActions } from "@/opencut/embed/scro-video-primary-actions";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import type { ScroVideoSeedClip, ScroVideoUiStage } from "@/opencut/embed/scro-video-types";

const STAGE_LABEL: Record<ScroVideoUiStage, string> = {
	awaiting_frames: "Waiting for stills",
	frames_generating: "Drawing stills",
	frames_ready: "Stills ready",
	video_generating: "Rendering video",
	video_ready: "Video ready",
	failed: "Failed",
};

function Field({ label, value }: { label: string; value?: string }) {
	const text = value?.trim();
	if (!text) return null;
	return <ScroClipTextField label={label} text={text} />;
}

function Detail({ clip }: { clip: ScroVideoSeedClip }) {
	return (
		<div className="space-y-3">
			{clip.dualBeat ? (
				<>
					<Field label="Start VO" value={clip.startVo || clip.englishVo} />
					<Field label="End VO" value={clip.endVo} />
				</>
			) : (
				<Field label="VO" value={clip.englishVo} />
			)}
			<Field label="Scene" value={clip.explainerScene} />
			<Field label="Motion" value={clip.motionCamera} />
		</div>
	);
}

/** Properties panel body for a selected ScroVideo clip. */
export function ScroVideoProperties({ clipNumber }: { clipNumber: number }) {
	const store = useScroVideos();
	const clip = store?.clips.find((item) => item.clipNumber === clipNumber);
	if (!store || !clip) {
		return (
			<div className="text-muted-foreground p-3 text-sm">
				Scro clip details unavailable.
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
				<div className="flex flex-col gap-4 p-3">
					<header className="space-y-1">
						<p className="text-sm font-semibold">{clip.name}</p>
						<p className="text-muted-foreground text-xs tabular-nums">
							{clip.timeRange
								? `${clip.timeRange} · ${clip.durationSeconds}s`
								: `${clip.durationSeconds}s`}
						</p>
						<p className="text-xs">{STAGE_LABEL[clip.stage]}</p>
					</header>
					<ScroVideoPrimaryActions videoId={store.videoId} clip={clip} />
					<ScroVideoAiEntry videoId={store.videoId} clip={clip} />
					<Detail clip={clip} />
				</div>
			</div>
			<ScroSceneEditInput videoId={store.videoId} clipNumber={clip.clipNumber} />
		</div>
	);
}

/** Resolve selected Scro clip from timeline element or Assets selection. */
export function useSelectedScroClipNumber(
	timelineClipNumber: number | null | undefined,
): number | null {
	const store = useScroVideos();
	if (timelineClipNumber != null) return timelineClipNumber;
	return store?.selectedClipNumber ?? null;
}
