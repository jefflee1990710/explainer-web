"use client";

import type { ReactNode } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/opencut/components/ui/context-menu";
import { TracksSnapshotCommand } from "@/opencut/commands/timeline/tracks-snapshot";
import { tracksWithTransitionOnAllCuts } from "@/opencut/effects/apply-all-transitions";
import { useEditor } from "@/opencut/editor/use-editor";

/** Right-click a transition card to place it on every cut and the ending. */
export function TransitionCatalogMenu({
	effectType,
	onAddHere,
	children,
}: {
	effectType: string;
	onAddHere: () => void;
	children: ReactNode;
}) {
	const editor = useEditor();

	const applyEverywhere = () => {
		const before = editor.scenes.getActiveScene().tracks;
		const after = tracksWithTransitionOnAllCuts({
			tracks: before,
			effectType,
		});
		if (!after) return;
		editor.command.execute({
			command: new TracksSnapshotCommand({ before, after }),
		});
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div className="w-full">{children}</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-56">
				<ContextMenuItem onSelect={onAddHere}>Add at playhead</ContextMenuItem>
				<ContextMenuItem onSelect={applyEverywhere}>
					Apply to all cuts and ending
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
