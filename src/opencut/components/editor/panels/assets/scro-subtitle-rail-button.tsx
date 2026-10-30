"use client";

import { SubtitleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/opencut/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/opencut/components/ui/tooltip";
import {
	setScroSubtitleOpen,
	useScroSubtitleCatalog,
	useScroSubtitleOpen,
} from "@/opencut/embed/scro-subtitle-store";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import { cn } from "@/opencut/utils/ui";

// Sits under the Text icon. Opens the subtitle style panel.
export function ScroSubtitleRailButton() {
	const open = useScroSubtitleOpen();
	const catalog = useScroSubtitleCatalog();
	const { oc } = useOpencutI18n();
	const label = oc.rail.subtitles || catalog?.ui.subtitles || "Subtitles";

	return (
		<Tooltip delayDuration={10}>
			<TooltipTrigger asChild>
				<Button
					variant={open ? "secondary" : "ghost"}
					size="icon"
					aria-label={label}
					aria-pressed={open}
					data-opencut-tour="rail-subtitles"
					className={cn("h-8 w-8 shrink-0", !open && "text-muted-foreground")}
					onClick={() => setScroSubtitleOpen(!open)}
				>
					<HugeiconsIcon icon={SubtitleIcon} />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="right" align="center" variant="sidebar" sideOffset={8}>
				<div className="text-[#12141c] text-sm leading-none font-medium">{label}</div>
			</TooltipContent>
		</Tooltip>
	);
}
