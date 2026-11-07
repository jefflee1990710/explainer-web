"use client";

import { Spinner } from "@/opencut/components/ui/spinner";

/** Storyboard clip on the timeline before a still exists. */
export function TimelineStillPlaceholder({ name }: { name: string }) {
	const label = name.replace(/\.png$/i, "");
	return (
		<div className="flex h-full min-w-0 flex-1 items-center gap-2 bg-muted px-2">
			<Spinner className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="text-foreground truncate text-xs font-medium">{label}</span>
		</div>
	);
}
