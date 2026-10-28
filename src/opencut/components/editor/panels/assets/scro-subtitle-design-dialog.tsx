"use client";

import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/opencut/components/ui/dialog";
import { Button } from "@/opencut/components/ui/button";
import {
	ScroSubtitleStyleGrid,
	type SubtitleStyleCard,
} from "@/opencut/components/editor/panels/assets/scro-subtitle-style-grid";

// Modal dialog that lets the user pick a subtitle design (e.g. Torn Paper Duo, Marker Brush, etc.)
// and confirms generating/updating the dedicated Subtitle Track.
export function ScroSubtitleDesignDialog({
	open,
	onOpenChange,
	styles,
	selectedId,
	fontFamilyOverride,
	fontLabel,
	busy,
	generateLabel,
	generatingLabel,
	onSelectStyle,
	onConfirmGenerate,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	styles: SubtitleStyleCard[];
	selectedId: string;
	fontFamilyOverride?: string | null;
	fontLabel: string;
	busy: boolean;
	generateLabel: string;
	generatingLabel: string;
	onSelectStyle: (id: string) => void;
	onConfirmGenerate: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader className="p-4 pb-3">
					<DialogTitle className="text-base">
						選擇字幕視覺設計 · Choose Subtitle Style
					</DialogTitle>
					<DialogDescription className="text-xs">
						已選字體：<span className="text-foreground font-medium">{fontLabel}</span>
						。揀選喜歡嘅字幕設計（例如撕紙雙色字卡、筆刷重點、圓角膠囊等），確認後會自動生成到專屬「字幕圖層」。
					</DialogDescription>
				</DialogHeader>

				<DialogBody className="max-h-[60vh] overflow-y-auto p-4 pt-2">
					<ScroSubtitleStyleGrid
						styles={styles}
						selectedId={selectedId}
						fontFamilyOverride={fontFamilyOverride}
						label="Subtitle Styles"
						onSelect={onSelectStyle}
					/>
				</DialogBody>

				<DialogFooter className="p-4 py-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={busy}
					>
						取消 · Cancel
					</Button>
					<Button
						type="button"
						disabled={busy}
						onClick={onConfirmGenerate}
					>
						{busy ? generatingLabel : `套用設計並${generateLabel}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
