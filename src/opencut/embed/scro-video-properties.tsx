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
export function ScroVideoProperties({
	clipNumber,
	showInspectorHeader = true,
}: {
	clipNumber: number;
	showInspectorHeader?: boolean;
}) {
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
			{showInspectorHeader ? (
				<div className="shrink-0">
					<div className="border-border flex h-10 items-center justify-between border-b px-3.5">
						<span className="text-foreground text-[13px] font-semibold tracking-tight">
							Inspector
						</span>
						<span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
							{STAGE_LABEL[clip.stage]}
						</span>
					</div>
					<div className="border-border space-y-1 border-b px-3.5 py-2.5">
						<p className="text-muted-foreground text-[11px] font-medium">
							Selected
						</p>
						<p className="text-foreground truncate text-[13px] font-semibold">
							{clip.name}
							<span className="text-muted-foreground font-medium">
								{" "}
								· {clip.durationSeconds}s
							</span>
						</p>
						{clip.timeRange ? (
							<p className="text-muted-foreground text-[11px] tabular-nums">
								{clip.timeRange}
							</p>
						) : null}
					</div>
				</div>
			) : null}
			<div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
				<div className="divide-border flex flex-col divide-y">
					<div className="flex items-center justify-between px-3.5 py-2.5">
						<span className="text-muted-foreground text-[11px] font-medium">
							Stage
						</span>
						<span className="bg-muted text-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
							{STAGE_LABEL[clip.stage]}
						</span>
					</div>
					<div className="space-y-3 px-3.5 py-3">
						<ScroVideoPrimaryActions videoId={store.videoId} clip={clip} />
						<ScroVideoAiEntry videoId={store.videoId} clip={clip} />
					</div>
					<div className="px-3.5 py-3">
						<Detail clip={clip} />
					</div>
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
