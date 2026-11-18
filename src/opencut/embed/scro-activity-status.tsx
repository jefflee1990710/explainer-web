"use client";

import { Spinner } from "@/opencut/components/ui/spinner";
import {
	scroVideoActivity,
	type ScroVideoActivity,
} from "@/opencut/embed/scro-preview-generate";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import { cn } from "@/opencut/utils/ui";

// Spinner plus Pending or Rendering. Other stages keep their own label.
export function ScroActivityStatus({
	clip,
	className,
	spinnerClassName,
}: {
	clip: Pick<ScroVideoSeedClip, "stage" | "wait">;
	className?: string;
	spinnerClassName?: string;
}) {
	const { oc } = useOpencutI18n();
	const activity: ScroVideoActivity | null = scroVideoActivity(clip);
	if (!activity) return null;
	const label =
		activity === "pending" ? oc.inspector.statusPending : oc.inspector.statusRendering;
	return (
		<span className={cn("inline-flex items-center gap-1", className)}>
			<Spinner className={cn("size-3 shrink-0", spinnerClassName)} />
			<span>{label}</span>
		</span>
	);
}
