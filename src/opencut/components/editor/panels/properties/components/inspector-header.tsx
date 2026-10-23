"use client";

import type { TimelineElement } from "@/opencut/timeline";
import { mediaTimeToSeconds, type MediaTime } from "@/opencut/wasm";

function formatShortTimestamp(seconds: number): string {
	const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
	const mins = Math.floor(safe / 60);
	const rem = safe - mins * 60;
	const wholeSecs = Math.floor(rem);
	const tenths = Math.floor((rem - wholeSecs) * 10 + 1e-6);
	return `${String(mins).padStart(2, "0")}:${String(wholeSecs).padStart(2, "0")}.${tenths}`;
}

const ELEMENT_TYPE_LABEL: Record<TimelineElement["type"], string> = {
	video: "video",
	image: "b-roll image",
	text: "caption",
	audio: "audio track",
	sticker: "sticker",
	graphic: "graphic",
	effect: "effect",
};

/**
 * Top Inspector summary block matching Reference Image 1:
 * - "Inspector" title bar
 * - "Selected" element name + type subtitle
 * - "Trim" Start → End timecode with visual lime range indicator
 */
export function InspectorHeader({
	element,
	totalDuration,
	subtitleOverride,
}: {
	element?: TimelineElement;
	totalDuration?: MediaTime;
	subtitleOverride?: string;
}) {
	if (!element) {
		return (
			<div className="border-border flex h-10 shrink-0 items-center justify-between border-b px-3.5">
				<span className="text-foreground text-[13px] font-semibold tracking-tight">
					Inspector
				</span>
			</div>
		);
	}

	const startSec = mediaTimeToSeconds({ time: element.startTime });
	const durationSec = mediaTimeToSeconds({ time: element.duration });
	const endSec = startSec + durationSec;
	const totalSec =
		totalDuration != null
			? Math.max(endSec, mediaTimeToSeconds({ time: totalDuration }), 0.1)
			: Math.max(endSec, 0.1);

	const startPct = Math.min(100, Math.max(0, (startSec / totalSec) * 100));
	const endPct = Math.min(100, Math.max(startPct + 2, (endSec / totalSec) * 100));
	const widthPct = Math.max(4, endPct - startPct);

	const typeSubtitle = subtitleOverride ?? ELEMENT_TYPE_LABEL[element.type];
	const textContent =
		element.type === "text" &&
		"params" in element &&
		typeof element.params.content === "string"
			? element.params.content.trim()
			: "";
	const displayName = textContent ? textContent.slice(0, 28) : element.name;

	return (
		<div className="shrink-0">
			{/* Top Inspector bar */}
			<div className="border-border flex h-10 items-center justify-between border-b px-3.5">
				<span className="text-foreground text-[13px] font-semibold tracking-tight">
					Inspector
				</span>
				<span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium capitalize">
					{element.type}
				</span>
			</div>

			{/* Selected section */}
			<div className="border-border space-y-1 border-b px-3.5 py-2.5">
				<p className="text-muted-foreground text-[11px] font-medium">
					Selected
				</p>
				<p className="text-foreground truncate text-[13px] font-semibold">
					{displayName}
					{typeSubtitle ? (
						<span className="text-muted-foreground font-medium">
							{" "}
							· {typeSubtitle}
						</span>
					) : null}
				</p>
			</div>

			{/* Trim section */}
			<div className="border-border space-y-2 border-b px-3.5 py-2.5">
				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-[11px] font-medium">Trim</p>
					<span className="text-muted-foreground text-[11px] tabular-nums">
						{durationSec.toFixed(1)}s
					</span>
				</div>
				<p className="text-foreground text-[12.5px] font-semibold tabular-nums">
					Start {formatShortTimestamp(startSec)} → End{" "}
					{formatShortTimestamp(endSec)}
				</p>
				<div className="bg-muted relative h-1.5 w-full rounded-full">
					<div
						className="absolute top-0 h-full rounded-full bg-[#a3e635]"
						style={{
							left: `${startPct}%`,
							width: `${widthPct}%`,
						}}
					/>
					<div
						className="border-background bg-foreground absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
						style={{
							left: `${endPct}%`,
						}}
					/>
				</div>
			</div>
		</div>
	);
}
