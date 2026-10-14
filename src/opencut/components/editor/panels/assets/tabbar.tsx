"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/opencut/components/ui/tooltip";
import { Button } from "@/opencut/components/ui/button";
import { cn } from "@/opencut/utils/ui";
import { useSearchParams } from "next/navigation";
import { isScroEmbed } from "@/opencut/embed/scro-transport";
import {
	TAB_KEYS,
	tabs,
	useAssetsPanelStore,
} from "@/opencut/components/editor/panels/assets/assets-panel-store";
import { ScroSubtitleRailButton } from "@/opencut/components/editor/panels/assets/scro-subtitle-rail-button";
import {
	setScroSubtitleOpen,
	useScroSubtitleOpen,
} from "@/opencut/embed/scro-subtitle-store";

export function TabBar() {
	const { activeTab, setActiveTab } = useAssetsPanelStore();
	const subtitleOpen = useScroSubtitleOpen();
	const embedded = isScroEmbed(useSearchParams().get("embed"));
	const [showTopFade, setShowTopFade] = useState(false);
	const [showBottomFade, setShowBottomFade] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	const checkScrollPosition = useCallback(() => {
		const element = scrollRef.current;
		if (!element) return;

		const { scrollTop, scrollHeight, clientHeight } = element;
		setShowTopFade(scrollTop > 0);
		setShowBottomFade(scrollTop < scrollHeight - clientHeight - 1);
	}, []);

	useEffect(() => {
		const element = scrollRef.current;
		if (!element) return;

		checkScrollPosition();
		element.addEventListener("scroll", checkScrollPosition);

		const resizeObserver = new ResizeObserver(checkScrollPosition);
		resizeObserver.observe(element);

		return () => {
			element.removeEventListener("scroll", checkScrollPosition);
			resizeObserver.disconnect();
		};
	}, [checkScrollPosition]);

	return (
		<div className="relative flex">
			<div
				ref={scrollRef}
				className="scrollbar-hidden relative flex size-full p-1 flex-col items-center justify-start gap-0.5 overflow-y-auto"
			>
				{TAB_KEYS.map((tabKey) => {
					const tab = tabs[tabKey];
					const active = !subtitleOpen && activeTab === tabKey;
					return (
						<Fragment key={tabKey}>
							<Tooltip delayDuration={10}>
								<TooltipTrigger asChild>
									<Button
										variant={active ? "secondary" : "ghost"}
										size="icon"
										aria-label={tab.label}
										className={cn(
											"shrink-0",
											"h-8 w-8",
											!active && "text-muted-foreground",
										)}
										onClick={() => {
											setScroSubtitleOpen(false);
											setActiveTab(tabKey);
										}}
									>
										<tab.icon />
									</Button>
								</TooltipTrigger>
								<TooltipContent
									side="right"
									align="center"
									variant="sidebar"
									sideOffset={8}
								>
									<div className="text-[#12141c] text-sm leading-none font-medium">
										{tab.label}
									</div>
								</TooltipContent>
							</Tooltip>
							{embedded && tabKey === "text" ? <ScroSubtitleRailButton /> : null}
						</Fragment>
					);
				})}
			</div>

			<FadeOverlay direction="top" show={showTopFade} />
			<FadeOverlay direction="bottom" show={showBottomFade} />
		</div>
	);
}

function FadeOverlay({
	direction,
	show,
}: {
	direction: "top" | "bottom";
	show: boolean;
}) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute right-0 left-0 h-6",
				direction === "top" && show
					? "from-background top-0 bg-linear-to-b to-transparent"
					: "from-background bottom-0 bg-linear-to-t to-transparent",
			)}
		/>
	);
}
