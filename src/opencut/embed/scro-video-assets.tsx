"use client";

import { useScroVideos, setScroVideoSelection } from "@/opencut/embed/scro-video-store";
import type { ScroVideoSeedClip, ScroVideoUiStage } from "@/opencut/embed/scro-video-types";
import { useEditor } from "@/opencut/editor/use-editor";
import { cn } from "@/opencut/utils/ui";

const STAGE_LABEL: Record<ScroVideoUiStage, string> = {
	awaiting_frames: "Waiting",
	frames_generating: "Drawing",
	frames_ready: "Stills ready",
	video_generating: "Rendering",
	video_ready: "Ready",
	failed: "Failed",
};

function stageTone(stage: ScroVideoUiStage) {
	if (stage === "failed") return "bg-red-500/15 text-red-700";
	if (stage === "video_ready") return "bg-emerald-500/15 text-emerald-800";
	if (stage === "frames_generating" || stage === "video_generating") {
		return "bg-amber-500/15 text-amber-900";
	}
	return "bg-muted text-muted-foreground";
}

/** Scro storyboard clips in the Media assets panel. */
export function ScroVideoAssets() {
	const store = useScroVideos();
	const editor = useEditor();
	if (!store || store.clips.length === 0) return null;

	const selectClip = (clip: ScroVideoSeedClip) => {
		setScroVideoSelection(clip.clipNumber);
		const scene = editor.scenes.getActiveScene();
		const hit = scene.tracks.main.elements.find(
			(element) =>
				(element.type === "video" || element.type === "image") &&
				element.scroClipNumber === clip.clipNumber,
		);
		if (hit) {
			editor.selection.setSelectedElements({
				elements: [{ trackId: scene.tracks.main.id, elementId: hit.id }],
			});
		}
	};

	return (
		<div className="mb-3 space-y-2">
			<div className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
				ScroVideo
			</div>
			<ul className="grid grid-cols-2 gap-2">
				{store.clips.map((clip) => {
					const selected = store.selectedClipNumber === clip.clipNumber;
					const thumb = clip.posterUrl || clip.videoUrl;
					const loading =
						clip.stage === "awaiting_frames" ||
						clip.stage === "frames_generating" ||
						clip.stage === "video_generating";
					return (
						<li key={clip.clipNumber}>
							<button
								type="button"
								onClick={() => selectClip(clip)}
								className={cn(
									"border-border bg-accent/40 hover:bg-accent flex w-full flex-col overflow-hidden rounded-sm border text-left transition-colors",
									selected && "ring-primary ring-2",
								)}
							>
								<div className="bg-muted relative aspect-video w-full overflow-hidden">
									{thumb ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={thumb}
											alt=""
											className="size-full object-cover"
										/>
									) : (
										<div className="text-muted-foreground grid size-full place-items-center text-[0.65rem]">
											{loading ? "Loading…" : "No still"}
										</div>
									)}
									{loading && thumb ? (
										<div className="absolute inset-0 grid place-items-center bg-black/35 text-[0.65rem] text-white">
											Loading…
										</div>
									) : null}
								</div>
								<div className="flex items-center justify-between gap-1 px-1.5 py-1">
									<span className="truncate text-[0.7rem] font-medium">
										{clip.name}
									</span>
									<span
										className={cn(
											"shrink-0 rounded px-1 py-0.5 text-[0.6rem]",
											stageTone(clip.stage),
										)}
									>
										{STAGE_LABEL[clip.stage]}
									</span>
								</div>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
