"use client";

import type { TimelineElement } from "@/opencut/timeline";

/** Inspector title bar. Selected clip name and trim range live on the timeline. */
export function InspectorHeader({ element }: { element?: TimelineElement }) {
	if (!element) {
		return (
			<div className="border-border flex h-10 shrink-0 items-center justify-between border-b px-3.5">
				<span className="text-foreground text-[13px] font-semibold tracking-tight">
					Inspector
				</span>
			</div>
		);
	}

	return (
		<div className="border-border flex h-10 shrink-0 items-center justify-between border-b px-3.5">
			<span className="text-foreground text-[13px] font-semibold tracking-tight">
				Inspector
			</span>
			<span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium capitalize">
				{element.type}
			</span>
		</div>
	);
}
