"use client";

import { ScrollArea } from "@/opencut/components/ui/scroll-area";
import { Button } from "@/opencut/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/opencut/components/ui/tooltip";
import { useEditor } from "@/opencut/editor/use-editor";
import { ScroVideoProperties } from "@/opencut/embed/scro-video-properties";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import { useElementSelection } from "@/opencut/timeline/hooks/element/use-element-selection";
import { usePropertiesStore } from "./stores/properties-store";
import { getPropertiesConfig } from "./registry";
import { cn } from "@/opencut/utils/ui";
import { EmptyView } from "./empty-view";

export function PropertiesPanel() {
	const editor = useEditor();
	useEditor((e) => e.scenes.getActiveSceneOrNull());
	useEditor((e) => e.media.getAssets());
	const { selectedElements } = useElementSelection();
	const { activeTabPerType, setActiveTab } = usePropertiesStore();
	const scroStore = useScroVideos();

	const timelineScroClip =
		selectedElements.length === 1
			? (() => {
					const located = editor.timeline.getElementsWithTracks({
						elements: selectedElements,
					})[0];
					const element = located?.element;
					if (
						element &&
						(element.type === "video" || element.type === "image") &&
						element.scroClipNumber != null
					) {
						return element.scroClipNumber;
					}
					return null;
				})()
			: null;
	// Assets click sets store selection; only use it when the timeline is empty.
	const scroClipNumber =
		timelineScroClip ??
		(selectedElements.length === 0 ? scroStore?.selectedClipNumber ?? null : null);

	if (selectedElements.length === 0) {
		if (scroClipNumber != null) {
			return (
				<div className="panel bg-background flex h-full min-h-0 flex-col overflow-hidden rounded-none border">
					<ScroVideoProperties clipNumber={scroClipNumber} />
				</div>
			);
		}
		return (
			<div className="panel bg-background flex h-full flex-col items-center justify-center overflow-hidden rounded-none border">
				<EmptyView />
			</div>
		);
	}

	if (selectedElements.length > 1) {
		return (
			<div className="panel bg-background flex h-full flex-col items-center justify-center overflow-hidden rounded-none border">
				<p className="text-muted-foreground text-sm">
					{selectedElements.length} elements selected.0
				</p>
			</div>
		);
	}

	const mediaAssets = editor.media.getAssets();

	const elementsWithTracks = editor.timeline.getElementsWithTracks({
		elements: selectedElements,
	});
	const elementWithTrack = elementsWithTracks[0];

	if (!elementWithTrack) return null;

	const { element, track } = elementWithTrack;

	if (timelineScroClip != null) {
		return (
			<div className="panel bg-background flex h-full min-h-0 flex-col overflow-hidden rounded-none border">
				<ScroVideoProperties clipNumber={timelineScroClip} />
			</div>
		);
	}

	const config = getPropertiesConfig({ element, mediaAssets });
	const visibleTabs = config.tabs;

	const storedTabId = activeTabPerType[element.type];
	const isStoredTabVisible = visibleTabs.some((t) => t.id === storedTabId);
	const activeTabId = isStoredTabVisible ? storedTabId : config.defaultTab;
	const activeTab =
		visibleTabs.find((t) => t.id === activeTabId) ?? visibleTabs[0];

	if (!activeTab) return null;

	return (
		<div className="panel bg-background flex h-full overflow-hidden rounded-none border">
			<TooltipProvider delayDuration={0}>
				<div className="flex shrink-0 flex-col gap-0.5 border-r p-1 scrollbar-hidden overflow-y-auto">
					{visibleTabs.map((tab) => (
						<Tooltip key={tab.id}>
							<TooltipTrigger asChild>
								<Button
									variant={tab.id === activeTab.id ? "secondary" : "ghost"}
									size="icon"
									onClick={() =>
										setActiveTab({
											elementType: element.type,
											tabId: tab.id,
										})
									}
									aria-label={tab.label}
									className={cn(
										"shrink-0",
										"h-8 w-8",
										tab.id !== activeTab.id && "text-muted-foreground",
									)}
								>
									{tab.icon}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">{tab.label}</TooltipContent>
						</Tooltip>
					))}
				</div>
			</TooltipProvider>
			<ScrollArea className="flex-1 scrollbar-hidden">
				{activeTab.content({ trackId: track.id })}
			</ScrollArea>
		</div>
	);
}
