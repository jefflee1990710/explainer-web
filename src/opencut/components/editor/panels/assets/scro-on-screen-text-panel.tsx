"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/opencut/editor/use-editor";
import { scroEmbedParentOrigin } from "@/opencut/embed/scro-embed-parent";
import { sendToScro } from "@/opencut/embed/scro-transport";
import {
	insertScroOnscreenTextOnTimeline,
	rebindOptimisticScroOnscreenTextId,
	removeScroOnscreenText,
	upsertScroOnscreenText,
	useScroOnscreenTexts,
	type ScroOnscreenText,
} from "@/opencut/embed/scro-onscreen-text";
import {
	useScroSubtitleCatalog,
	useScroSubtitleVideoId,
} from "@/opencut/embed/scro-subtitle-store";
import { ScroOnScreenTextDialog } from "@/opencut/components/editor/panels/assets/scro-on-screen-text-dialog";
import { Spinner } from "@/opencut/components/ui/spinner";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import { enqueueOpencutOnScreenTextAction } from "@/presentation/actions/opencut-subtitle";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { cn } from "@/opencut/utils/ui";

// Panel listing AI-generated subtitle style images and `ScroOnscreenText` items;
// clicking Generate inserts a placeholder on the timeline immediately and runs generation in the background queue.
export function ScroOnScreenTextPanel() {
	const editor = useEditor();
	const catalog = useScroSubtitleCatalog();
	const videoId = useScroSubtitleVideoId();
	const onscreenItems = useScroOnscreenTexts();
	const { oc } = useOpencutI18n();

	const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const styles = catalog?.styles ?? [];
	const activeStyleId =
		selectedStyleId && styles.some((style) => style.id === selectedStyleId)
			? selectedStyleId
			: catalog?.selectedId ?? styles[0]?.id ?? "";
	const selectedStyle =
		styles.find((style) => style.id === activeStyleId) ?? styles[0] ?? null;

	const handleGenerate = async (rawText: string) => {
		const trimmed = rawText.trim();
		if (!trimmed) {
			setError(oc.onScreenText.emptyTextError);
			return;
		}
		if (!videoId || !selectedStyle) return;

		setError(null);
		// Immediately close dialog to return to editor and show the placeholder on timeline & assets.
		setDialogOpen(false);

		const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		const optimisticItem: ScroOnscreenText = {
			id: tempId,
			text: trimmed,
			textStyleId: selectedStyle.id,
			styleName: selectedStyle.name,
			status: "queued",
			submittedAt: new Date().toISOString(),
		};

		upsertScroOnscreenText(optimisticItem);
		await insertScroOnscreenTextOnTimeline({
			editor,
			videoId,
			item: optimisticItem,
			trackTitle: oc.onScreenText.title,
		});

		try {
			const res = await enqueueOpencutOnScreenTextAction({
				videoId,
				textStyleId: selectedStyle.id,
				styleName: selectedStyle.name,
				text: trimmed,
			});
			notifyTasksChanged();

			if (!res.ok) {
				removeScroOnscreenText(tempId);
				toast.error(res.error || oc.onScreenText.failedError);
				return;
			}

			const realItem: ScroOnscreenText = {
				id: res.item.id,
				text: res.item.text,
				textStyleId: res.item.textStyleId,
				styleName: res.item.styleName ?? selectedStyle.name,
				status: res.item.status,
				url: res.item.blobUrl || res.item.outputUrl,
				error: res.item.error,
				submittedAt: res.item.submittedAt,
			};

			rebindOptimisticScroOnscreenTextId({
				editor,
				tempId,
				realItem,
			});

			const origin = scroEmbedParentOrigin();
			if (origin) {
				sendToScro(
					{
						type: "scro-project-updated",
						videoId,
						project: res.project,
					},
					origin,
				);
			}
		} catch (err) {
			removeScroOnscreenText(tempId);
			toast.error(err instanceof Error ? err.message : oc.onScreenText.failedError);
		}
	};

	if (!catalog) {
		return <div className="text-muted-foreground p-4 text-sm">…</div>;
	}

	return (
		<div className="flex h-full flex-col">
			<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
				<div>
					<h2 className="text-sm font-medium">{oc.onScreenText.title}</h2>
					<p className="text-muted-foreground mt-1 text-xs leading-snug">
						{oc.onScreenText.hint}
					</p>
				</div>

				{onscreenItems.length > 0 ? (
					<div className="space-y-2">
						<div className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
							{oc.onScreenText.generatedHeading}
						</div>
						<div className="grid grid-cols-2 gap-2">
							{onscreenItems.map((item) => {
								const isPending =
									item.status === "queued" || item.status === "in_progress";
								const isFailed = item.status === "failed";
								const styleCard = styles.find((s) => s.id === item.textStyleId);
								const styleTitle = item.styleName || styleCard?.name || item.textStyleId;

								return (
									<button
										key={item.id}
										type="button"
										disabled={isPending || isFailed}
										onClick={() => {
											if (item.status !== "completed" || !item.url) return;
											void insertScroOnscreenTextOnTimeline({
												editor,
												videoId,
												item,
												trackTitle: oc.onScreenText.title,
											}).then((ok) => {
												if (ok) toast.success(oc.onScreenText.addedToast);
											});
										}}
										className={cn(
											"group flex flex-col gap-1 rounded-md border p-1.5 text-left transition",
											isPending
												? "border-amber-500/40 bg-amber-500/5 cursor-wait"
												: isFailed
													? "border-destructive/40 bg-destructive/5 cursor-not-allowed"
													: "border-border/70 hover:border-foreground cursor-pointer",
										)}
									>
										<div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-sm bg-[#12141c] p-1">
											{item.status === "completed" && item.url ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={item.url}
													alt={item.text}
													className="max-h-full max-w-full object-contain"
												/>
											) : isPending ? (
												<div className="flex flex-col items-center justify-center gap-1.5 px-2 text-center">
													<Spinner className="size-4 text-[#c6f24b]" />
													<span className="line-clamp-1 text-[10px] font-bold text-[#c6f24b]">
														{oc.onScreenText.generating}
													</span>
												</div>
											) : (
												<span className="px-2 text-center text-[10px] font-medium text-red-400">
													{item.error || oc.onScreenText.failedError}
												</span>
											)}
										</div>
										<span className="truncate text-xs font-medium">{item.text}</span>
										<span className="text-muted-foreground truncate text-[10px]">
											{isPending
												? `${styleTitle} · ${oc.onScreenText.generating}`
												: isFailed
													? `${styleTitle} · Failed`
													: `${styleTitle} · ${oc.onScreenText.insertAgain}`}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				) : null}

				<div className="space-y-2">
					<div className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
						{oc.onScreenText.stylesHeading}
					</div>
					<div
						className="grid grid-cols-2 gap-2"
						role="listbox"
						aria-label={oc.onScreenText.stylesHeading}
					>
						{styles.map((style) => {
							const active = style.id === activeStyleId;
							return (
								<button
									key={style.id}
									type="button"
									role="option"
									aria-selected={active}
									onClick={() => {
										setSelectedStyleId(style.id);
										setError(null);
										setDialogOpen(true);
									}}
									className={cn(
										"group flex cursor-pointer flex-col gap-1 rounded-md border p-1.5 text-left transition",
										active
											? "border-foreground bg-secondary shadow-xs"
											: "border-border/60 hover:border-foreground/50 hover:bg-muted/60",
									)}
								>
									<div className="bg-muted relative aspect-video w-full overflow-hidden rounded-sm">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={style.previewUrl}
											alt={style.name}
											className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
										/>
									</div>
									<span className="truncate px-0.5 text-xs font-medium">
										{style.name}
									</span>
									<span className="text-muted-foreground truncate px-0.5 text-[10px]">
										{oc.onScreenText.clickToType}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<ScroOnScreenTextDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				styles={styles}
				selectedStyle={selectedStyle}
				busy={false}
				error={error}
				onSelectStyle={(id) => {
					setSelectedStyleId(id);
					setError(null);
				}}
				onGenerate={(text) => void handleGenerate(text)}
			/>
		</div>
	);
}
