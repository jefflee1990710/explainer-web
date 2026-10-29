"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/opencut/components/ui/input";
import {
	ScroSubtitleStyleGrid,
	type SubtitleStyleCard,
} from "@/opencut/components/editor/panels/assets/scro-subtitle-style-grid";
import { resolveArtisticSubtitlePreset } from "@/opencut/subtitles/artistic-presets";

type FilterTab = "all" | "single" | "duo";

// Modal dialog that lets the user pick a subtitle design (65+ Single-Line & Dual-Line styles)
// with compact wide strip previews, category tabs, and search.
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
	confirmLabel,
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
	confirmLabel?: string;
	onSelectStyle: (id: string) => void;
	onConfirmGenerate: () => void;
}) {
	const [tab, setTab] = useState<FilterTab>("all");
	const [query, setQuery] = useState("");

	const filteredStyles = useMemo(() => {
		const q = query.trim().toLowerCase();
		return styles.filter((item) => {
			const lookId = item.drawLook || item.id;
			const preset = resolveArtisticSubtitlePreset(lookId);
			const isSingle =
				Boolean(item.singleLine) ||
				Boolean(preset.style.singleLine) ||
				!preset.sampleText.includes("\n");
			if (tab === "single" && !isSingle) return false;
			if (tab === "duo" && isSingle) return false;
			if (!q) return true;
			return (
				item.name.toLowerCase().includes(q) ||
				item.id.toLowerCase().includes(q) ||
				preset.sampleText.toLowerCase().includes(q)
			);
		});
	}, [styles, tab, query]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader className="p-4 pb-3">
					<DialogTitle className="text-base">
						選擇字幕視覺設計 · Choose Subtitle Style ({styles.length})
					</DialogTitle>
					<DialogDescription className="text-xs">
						已選字體：<span className="font-semibold text-[#12141c]">{fontLabel}</span>
						。可切換「單行設計」或「雙行撞色設計」，確認後自動生成到專屬「字幕圖層」。
					</DialogDescription>

					{/* Filter Tabs + Search */}
					<div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-1">
						<div className="inline-flex rounded-lg border border-[#e4e4e7] bg-[#f4f4f5] p-0.5">
							{(
								[
									{ id: "all", label: "全部設計 · All" },
									{ id: "single", label: "單行字幕 · Single-Line" },
									{ id: "duo", label: "雙行撞色 · Dual-Line" },
								] as const
							).map((item) => {
								const active = tab === item.id;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => setTab(item.id)}
										className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition ${
											active
												? "bg-[#12141c] text-white shadow-xs"
												: "text-[#5c6170] hover:text-[#12141c]"
										}`}
									>
										{item.label}
									</button>
								);
							})}
						</div>

						<div className="w-48 sm:w-56">
							<Input
								size="xs"
								value={query}
								onChange={(e) => setQuery(e.currentTarget.value)}
								placeholder="搜尋設計 (e.g. 撕紙, 單行, Neon)..."
								showClearIcon
								onClear={() => setQuery("")}
							/>
						</div>
					</div>
				</DialogHeader>

				<DialogBody className="max-h-[58vh] overflow-y-auto p-4 pt-2">
					{filteredStyles.length === 0 ? (
						<p className="py-8 text-center text-xs text-[#5c6170]">
							找不到符合「{query}」嘅字幕設計
						</p>
					) : (
						<ScroSubtitleStyleGrid
							styles={filteredStyles}
							selectedId={selectedId}
							fontFamilyOverride={fontFamilyOverride}
							label="Subtitle Styles"
							onSelect={onSelectStyle}
						/>
					)}
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
						{busy ? generatingLabel : confirmLabel || generateLabel || "套用設計並生成"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
