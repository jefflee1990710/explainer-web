"use client";

import { type ReactNode, useRef } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/opencut/components/ui/context-menu";
import { TracksSnapshotCommand } from "@/opencut/commands/timeline/tracks-snapshot";
import { tracksWithTransitionOnAllCuts } from "@/opencut/effects/apply-all-transitions";
import { useEditor } from "@/opencut/editor/use-editor";

/** Right-click a transition card to place it on the heading, every cut, and the ending. */
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
	// Pointer-up and select can both fire for one click. Run the action once.
	const ranRef = useRef(false);

	const runOnce = (action: () => void) => {
		if (ranRef.current) return;
		ranRef.current = true;
		action();
		window.setTimeout(() => {
			ranRef.current = false;
		}, 0);
	};

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
			<ContextMenuContent className="w-64">
				<ContextMenuItem
					onSelect={() => runOnce(onAddHere)}
					onPointerUp={() => {
						// Click can be dropped while the menu disables pointer events on the page.
						runOnce(onAddHere);
					}}
				>
					Add at playhead
				</ContextMenuItem>
				<ContextMenuItem
					onSelect={() => runOnce(applyEverywhere)}
					onPointerUp={() => {
						runOnce(applyEverywhere);
					}}
				>
					Apply to all cuts, heading, and ending
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
