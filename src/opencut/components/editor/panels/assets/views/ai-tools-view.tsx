"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
	HeadphonesIcon,
	Image02Icon,
	MagicWand05Icon,
	MusicNote03Icon,
	SparklesIcon,
	SubtitleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Button } from "@/opencut/components/ui/button";
import { ScrollArea } from "@/opencut/components/ui/scroll-area";
import { useEditor } from "@/opencut/editor/use-editor";
import {
	runAutoInsertBgmOnTimeline,
	runAutoInsertSfxOnTimeline,
} from "@/opencut/embed/scro-auto-audio";
import { runSmoothSilenceGapsOnTimeline } from "@/opencut/embed/scro-smooth-silence";
import {
	setScroSubtitleOpen,
	useScroSubtitleCatalog,
	useScroSubtitleVideoId,
} from "@/opencut/embed/scro-subtitle-store";
import { isScroEmbed } from "@/opencut/embed/scro-transport";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import { runAutoInsertBrollOnTimeline } from "@/opencut/components/editor/panels/assets/views/stock-media-view";
import { cn } from "@/opencut/utils/ui";

type ToolBusyKey = "broll" | "sfx" | "bgm" | "silence" | null;

type AiToolCardProps = {
	icon: IconSvgElement;
	title: string;
	description: string;
	actionLabel: string;
	busyLabel: string;
	busy: boolean;
	disabled?: boolean;
	onClick: () => void;
};

function AiToolCard({
	icon,
	title,
	description,
	actionLabel,
	busyLabel,
	busy,
	disabled,
	onClick,
}: AiToolCardProps) {
	return (
		<div className="border-border/70 bg-accent/20 flex flex-col gap-2 rounded-md border p-3">
			<div className="flex items-start gap-2.5">
				<div className="bg-background text-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border">
					<HugeiconsIcon icon={icon} size={16} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium leading-tight">{title}</div>
					<p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
						{description}
					</p>
				</div>
			</div>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				disabled={busy || disabled}
				onClick={onClick}
				className="w-full justify-center text-xs font-semibold"
			>
				{busy ? busyLabel : actionLabel}
			</Button>
		</div>
	);
}

/** Unified entry for OpenCut AI automations: subtitles, B-roll, Foley, BGM, silence. */
export function AiToolsView() {
	const editor = useEditor();
	const catalog = useScroSubtitleCatalog();
	const subtitleVideoId = useScroSubtitleVideoId();
	const scroVideos = useScroVideos();
	const embedded = isScroEmbed(useSearchParams().get("embed"));
	const [busy, setBusy] = useState<ToolBusyKey>(null);

	const lines = catalog?.lines ?? [];
	const hasLines = lines.length > 0;
	const videoId = subtitleVideoId ?? scroVideos?.videoId;

	const runTool = async (key: Exclude<ToolBusyKey, null>, fn: () => Promise<void>) => {
		if (busy) return;
		setBusy(key);
		try {
			await fn();
		} finally {
			setBusy(null);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<div className="space-y-1.5 border-b p-3">
				<div className="flex items-center gap-2">
					<HugeiconsIcon icon={SparklesIcon} size={16} />
					<h2 className="text-sm font-medium">AI 自動化工具</h2>
				</div>
				<p className="text-muted-foreground text-[11px] leading-snug">
					把字幕、B-Roll、聲效、背景音樂與靜音平滑集中在這裡一鍵加強時間軸
				</p>
			</div>

			<ScrollArea className="min-h-0 flex-1 p-3">
				<div className="flex flex-col gap-2.5 pb-4">
					{embedded ? (
						<AiToolCard
							icon={SubtitleIcon}
							title="字幕 · Subtitles"
							description="開啟藝術字幕面板，依對白一鍵生成可編輯字幕軌"
							actionLabel="開啟字幕面板"
							busyLabel="開啟中…"
							busy={false}
							onClick={() => setScroSubtitleOpen(true)}
						/>
					) : null}

					<AiToolCard
						icon={Image02Icon}
						title="B-Roll 插圖"
						description="AI 分析對白，自動在主軌上方加插免費插圖／短片"
						actionLabel="自動加入 B-Roll"
						busyLabel="AI 正在規劃並加插 B-Roll…"
						busy={busy === "broll"}
						disabled={!hasLines}
						onClick={() =>
							void runTool("broll", async () => {
								const res = await runAutoInsertBrollOnTimeline({
									editor,
									lines,
									videoId,
									mediaType: "image",
								});
								if (res.error) toast.error(res.error);
								else toast.success(`已自動加插 ${res.insertedCount} 段 B-Roll`);
							})
						}
					/>

					<AiToolCard
						icon={HeadphonesIcon}
						title="聲效 · Foley SFX"
						description="依分鏡動作挑選短 Foley／whoosh，讓畫面更立體"
						actionLabel="AI 自動加聲效"
						busyLabel="AI 正在挑選並加入聲效…"
						busy={busy === "sfx"}
						disabled={!hasLines}
						onClick={() =>
							void runTool("sfx", async () => {
								const res = await runAutoInsertSfxOnTimeline({ editor, lines });
								if (res.error) toast.error(res.error);
								else toast.success(`已自動加入 ${res.insertedCount} 段聲效`);
							})
						}
					/>

					<AiToolCard
						icon={MusicNote03Icon}
						title="背景音樂 · BGM"
						description="依整支片氣氛挑選安靜 instrumental 底樂，鋪在語音下方"
						actionLabel="AI 選擇背景音樂"
						busyLabel="AI 正在挑選背景音樂…"
						busy={busy === "bgm"}
						disabled={!hasLines}
						onClick={() =>
							void runTool("bgm", async () => {
								const firstClip = scroVideos?.clips?.[0];
								const res = await runAutoInsertBgmOnTimeline({
									editor,
									lines,
									title:
										firstClip?.englishVo?.slice(0, 40) ||
										firstClip?.name?.slice(0, 40),
								});
								if (res.error) toast.error(res.error);
								else {
									const mood = res.selection?.mood ?? "ambient";
									toast.success(`已加入背景音樂（${mood}）`);
								}
							})
						}
					/>

					<AiToolCard
						icon={MagicWand05Icon}
						title="平滑接口靜音"
						description="裁掉片段前後多餘靜音，讓分鏡接軌更緊"
						actionLabel="平滑靜音接口"
						busyLabel="正在偵測並平滑靜音…"
						busy={busy === "silence"}
						onClick={() =>
							void runTool("silence", async () => {
								const res = await runSmoothSilenceGapsOnTimeline({ editor });
								if (res.error) {
									toast.info(res.error);
									return;
								}
								toast.success(
									res.trimmedClipsCount > 0
										? `已平滑 ${res.trimmedClipsCount} 段影片接口靜音停頓`
										: "已完成片段接口對齊（未偵測到多餘前後靜音）",
								);
							})
						}
					/>

					{!hasLines ? (
						<p
							className={cn(
								"text-muted-foreground rounded-md border border-dashed px-3 py-2 text-center text-[11px]",
							)}
						>
							載入分鏡對白後，B-Roll／聲效／背景音樂即可使用
						</p>
					) : null}
				</div>
			</ScrollArea>
		</div>
	);
}
