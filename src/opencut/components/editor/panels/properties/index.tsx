"use client";

import { SparklesIcon, SubtitleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ScrollArea } from "@/opencut/components/ui/scroll-area";
import { useEditor } from "@/opencut/editor/use-editor";
import { resolveElementScroClipNumber } from "@/opencut/embed/scro-clip-number";
import { ScroVideoProperties } from "@/opencut/embed/scro-video-properties";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import { useElementSelection } from "@/opencut/timeline/hooks/element/use-element-selection";
import { usePropertiesStore } from "./stores/properties-store";
import { getPropertiesConfig, type PropertiesTabDef } from "./registry";
import { cn } from "@/opencut/utils/ui";
import { EmptyView } from "./empty-view";
import { InspectorHeader } from "./components/inspector-header";
import { SubtitleTrackStyleControls } from "@/opencut/components/editor/panels/assets/subtitle-track-style-controls";
import { isScroSubtitleName } from "@/opencut/embed/scro-subtitle-slots";
import { isSubtitleTrack } from "@/opencut/subtitles/insert";

export function PropertiesPanel() {
	const editor = useEditor();
	useEditor((e) => e.scenes.getActiveSceneOrNull());
	useEditor((e) => e.media.getAssets());
	const { selectedElements } = useElementSelection();
	const { activeTabPerType, setActiveTab } = usePropertiesStore();
	const scroStore = useScroVideos();

	const mediaAssets = editor.media.getAssets();
	// "Clip N.mp4" on a restored timeline has no scroClipNumber field.
	const timelineScroClip =
		selectedElements.length === 1
			? (() => {
					const located = editor.timeline.getElementsWithTracks({
						elements: selectedElements,
					})[0];
					const element = located?.element;
					if (!element) return null;
					return resolveElementScroClipNumber({
						element,
						assets: mediaAssets,
						clips: scroStore?.clips,
					});
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
					<ScroVideoProperties clipNumber={scroClipNumber} showInspectorHeader />
				</div>
			);
		}
		return (
			<div className="panel bg-background flex h-full flex-col overflow-hidden rounded-none border">
				<InspectorHeader />
				<div className="flex flex-1 items-center justify-center">
					<EmptyView />
				</div>
			</div>
		);
	}

	if (selectedElements.length > 1) {
		const multiElementsWithTracks = editor.timeline.getElementsWithTracks({
			elements: selectedElements,
		});
		const firstTrack = multiElementsWithTracks[0]?.track;
		const allSameSubtitleTrack =
			firstTrack?.type === "text" &&
			multiElementsWithTracks.every(
				(item) =>
					item.track.id === firstTrack.id &&
					(isScroSubtitleName({ name: item.element.name }) ||
						isSubtitleTrack({
							name: firstTrack.name,
							elements: firstTrack.elements,
						})),
			);

		if (allSameSubtitleTrack && firstTrack) {
			return (
				<div className="panel bg-background flex h-full min-h-0 flex-col overflow-hidden rounded-none border">
					<InspectorHeader />
					<ScrollArea className="min-h-0 flex-1 scrollbar-hidden">
						<SubtitleTrackStyleControls trackId={firstTrack.id} />
					</ScrollArea>
				</div>
			);
		}

		return (
			<div className="panel bg-background flex h-full flex-col overflow-hidden rounded-none border">
				<InspectorHeader />
				<div className="flex flex-1 items-center justify-center p-4">
					<p className="text-muted-foreground text-sm font-medium">
						{selectedElements.length} elements selected
					</p>
				</div>
			</div>
		);
	}

	const elementsWithTracks = editor.timeline.getElementsWithTracks({
		elements: selectedElements,
	});
	const elementWithTrack = elementsWithTracks[0];

	if (!elementWithTrack) return null;

	const { element, track } = elementWithTrack;

	const config = getPropertiesConfig({ element, mediaAssets });
	const scroTab: PropertiesTabDef | null =
		timelineScroClip != null
			? {
					id: "scro-scene",
					label: "Scene AI",
					icon: <HugeiconsIcon icon={SparklesIcon} size={14} />,
					content: () => (
						<ScroVideoProperties
							clipNumber={timelineScroClip}
							showInspectorHeader={false}
						/>
					),
				}
			: null;

	const isSubtitleElement =
		track.type === "text" &&
		(isScroSubtitleName({ name: element.name }) ||
			isSubtitleTrack({ name: track.name, elements: track.elements }));

	const subtitleTrackTab: PropertiesTabDef | null = isSubtitleElement
		? {
				id: "subtitle-track",
				label: "Subtitle Track · 全軌",
				icon: <HugeiconsIcon icon={SubtitleIcon} size={14} />,
				content: ({ trackId: tId }) => (
					<SubtitleTrackStyleControls trackId={tId} compact />
				),
			}
		: null;

	const visibleTabs: PropertiesTabDef[] = [
		...(scroTab ? [scroTab] : []),
		...(subtitleTrackTab ? [subtitleTrackTab] : []),
		...config.tabs,
	];

	const defaultTabId = scroTab
		? scroTab.id
		: subtitleTrackTab
			? subtitleTrackTab.id
			: config.defaultTab;
	const storedTabId = activeTabPerType[element.type];
	const isStoredTabVisible = visibleTabs.some((t) => t.id === storedTabId);
	const activeTabId = isStoredTabVisible ? storedTabId : defaultTabId;
	const activeTab =
		visibleTabs.find((t) => t.id === activeTabId) ?? visibleTabs[0];

	if (!activeTab) return null;

	return (
		<div className="panel bg-background flex h-full min-h-0 flex-col overflow-hidden rounded-none border">
			<InspectorHeader element={element} />

			{/* Horizontal segmented pill tab bar */}
			{visibleTabs.length > 1 ? (
				<div className="border-border bg-muted/25 scrollbar-hidden flex shrink-0 items-center gap-1 overflow-x-auto border-b px-2.5 py-1.5">
					{visibleTabs.map((tab) => {
						const isActive = tab.id === activeTab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() =>
									setActiveTab({
										elementType: element.type,
										tabId: tab.id,
									})
								}
								className={cn(
									"inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
									isActive
										? "bg-foreground text-background shadow-xs"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								<span className="flex shrink-0 items-center">{tab.icon}</span>
								<span>{tab.label}</span>
							</button>
						);
					})}
				</div>
			) : null}

			{activeTab.id === "scro-scene" ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{activeTab.content({ trackId: track.id })}
				</div>
			) : (
				<ScrollArea className="min-h-0 flex-1 scrollbar-hidden">
					{activeTab.content({ trackId: track.id })}
				</ScrollArea>
			)}
		</div>
	);
}
