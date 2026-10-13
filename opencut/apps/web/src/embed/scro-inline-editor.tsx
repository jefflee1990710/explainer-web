"use client";

import { useMemo, useState } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { AssetsPanel } from "@/components/editor/panels/assets";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { Timeline } from "@/timeline/components";
import { PreviewPanel } from "@/preview/components";
import { EditorProvider } from "@/components/providers/editor-provider";
import { usePanelStore } from "@/editor/panel-store";
import { usePasteMedia } from "@/media/use-paste-media";
import { useEditor } from "@/editor/use-editor";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
	createPreviewOverlayControl,
	isPreviewOverlayVisible,
	mergePreviewOverlaySources,
} from "@/preview/overlays";
import { usePreviewStore } from "@/preview/preview-store";
import { getGuidePreviewOverlaySource } from "@/guides";
import {
	bookmarkNotesPreviewOverlay,
	getBookmarkPreviewOverlaySource,
} from "@/timeline/bookmarks/index";
import { ScroClipImport } from "@/embed/scro-clip-import";
import { ScroSubtitleBridge } from "@/embed/scro-subtitle-bridge";
import { ScroExportBridge } from "@/embed/scro-export-bridge";
import { ScroProjectSync } from "@/embed/scro-project-sync";
import { Toaster } from "sonner";

// OpenCut editor mounted inside Scro's React tree. No iframe, no second origin.
export default function OpenCutInlineEditor({ projectId }: { projectId: string }) {
	return (
		<EditorProvider projectId={projectId}>
			<ScroClipImport />
			<ScroExportBridge />
			<ScroProjectSync />
			<ScroSubtitleBridge />
			<div className="opencut-direct-host bg-background flex h-full min-h-0 w-full flex-col overflow-hidden">
				<DegradedRendererBanner />
				<div className="min-h-0 min-w-0 flex-1">
					<EditorLayout />
				</div>
				<Toaster />
			</div>
		</EditorProvider>
	);
}

function DegradedRendererBanner() {
	const isDegraded = useEditor((editor) => editor.renderer.isDegraded);
	const [dismissed, setDismissed] = useState(false);
	if (!isDegraded || dismissed) return null;

	return (
		<div className="bg-accent border-b flex h-9 items-center justify-center gap-2 text-xs text-muted-foreground">
			<span>For the best experience, open this editor in Chrome.</span>
			<Button
				variant="text"
				size="icon"
				className="w-auto p-0 [&_svg]:size-3.5"
				onClick={() => setDismissed(true)}
				aria-label="Dismiss"
			>
				<HugeiconsIcon icon={Cancel01Icon} />
			</Button>
		</div>
	);
}

function EditorLayout() {
	usePasteMedia();
	const { panels, setPanel } = usePanelStore();
	const activeScene = useEditor((editor) => editor.scenes.getActiveSceneOrNull());
	const currentTime = useEditor((editor) => editor.playback.getCurrentTime());
	const activeGuide = usePreviewStore((state) => state.activeGuide);
	const overlays = usePreviewStore((state) => state.overlays);
	const setOverlayVisibility = usePreviewStore((state) => state.setOverlayVisibility);
	const showBookmarkNotes = isPreviewOverlayVisible({
		overlay: bookmarkNotesPreviewOverlay,
		overlays,
	});

	const overlaySource = useMemo(
		() =>
			mergePreviewOverlaySources({
				sources: [
					getGuidePreviewOverlaySource({ guideId: activeGuide }),
					activeScene
						? getBookmarkPreviewOverlaySource({
								bookmarks: activeScene.bookmarks,
								time: currentTime,
								isVisible: showBookmarkNotes,
							})
						: { definitions: [bookmarkNotesPreviewOverlay], instances: [] },
				],
			}),
		[activeGuide, activeScene, currentTime, showBookmarkNotes],
	);

	const overlayControls = useMemo(
		() =>
			overlaySource.definitions.map((overlay) =>
				createPreviewOverlayControl({ overlay, overlays }),
			),
		[overlaySource.definitions, overlays],
	);

	return (
		<ResizablePanelGroup
			direction="vertical"
			className="size-full gap-[0.18rem]"
			onLayout={(sizes) => {
				setPanel({ panel: "mainContent", size: sizes[0] ?? panels.mainContent });
				setPanel({ panel: "timeline", size: sizes[1] ?? panels.timeline });
			}}
		>
			<ResizablePanel defaultSize={panels.mainContent} minSize={30} maxSize={85} className="min-h-0">
				<ResizablePanelGroup
					direction="horizontal"
					className="size-full gap-[0.19rem] px-3 pt-3"
					onLayout={(sizes) => {
						setPanel({ panel: "tools", size: sizes[0] ?? panels.tools });
						setPanel({ panel: "preview", size: sizes[1] ?? panels.preview });
						setPanel({ panel: "properties", size: sizes[2] ?? panels.properties });
					}}
				>
					<ResizablePanel defaultSize={panels.tools} minSize={15} maxSize={40} className="min-w-0">
						<AssetsPanel />
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize={panels.preview} minSize={30} className="min-h-0 min-w-0 flex-1">
						<PreviewPanel
							overlayControls={overlayControls}
							overlayInstances={overlaySource.instances}
							onOverlayVisibilityChange={setOverlayVisibility}
						/>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel
						defaultSize={panels.properties}
						minSize={15}
						maxSize={40}
						className="min-w-0"
					>
						<PropertiesPanel />
					</ResizablePanel>
				</ResizablePanelGroup>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel
				defaultSize={panels.timeline}
				minSize={15}
				maxSize={70}
				className="min-h-0 px-3 pb-3"
			>
				<Timeline />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
