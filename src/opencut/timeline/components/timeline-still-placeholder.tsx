"use client";

/** Storyboard clip on the timeline before a still exists. */
export function TimelineStillPlaceholder({ name }: { name: string }) {
	const label = name.replace(/\.png$/i, "");
	return (
		<div className="flex h-full min-w-0 flex-1 items-center gap-2 bg-[#f4f4f5] px-2">
			<span className="grid size-7 shrink-0 place-items-center rounded-md border border-[#d4d4d8] bg-white text-[#5c6170]">
				<FrameIcon />
			</span>
			<span className="text-foreground truncate text-xs font-medium">{label}</span>
			<span className="text-muted-foreground truncate text-[0.65rem]">
				Waiting for stills
			</span>
		</div>
	);
}

function FrameIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.25" />
			<circle cx="5.25" cy="6" r="1" fill="currentColor" />
			<path
				d="M3.5 11.25 6.2 8.4l2 1.7 2.1-2.35L12.6 11.25"
				stroke="currentColor"
				strokeWidth="1.25"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}
