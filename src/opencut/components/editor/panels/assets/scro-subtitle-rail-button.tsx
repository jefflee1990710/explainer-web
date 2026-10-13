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
import { cn } from "@/opencut/utils/ui";

// Sits under the last asset icon. Opens the subtitle style panel.
export function ScroSubtitleRailButton() {
	const open = useScroSubtitleOpen();
	const catalog = useScroSubtitleCatalog();
	const label = catalog?.ui.subtitles || "Subtitles";

	return (
		<div className="mt-1 flex justify-center border-t pt-1.5">
			<Tooltip delayDuration={10}>
				<TooltipTrigger asChild>
					<Button
						variant={open ? "secondary" : "ghost"}
						size="icon"
						aria-label={label}
						aria-pressed={open}
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
		</div>
	);
}
