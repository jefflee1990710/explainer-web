"use client";

import { useState } from "react";
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
import { Textarea } from "@/opencut/components/ui/textarea";
import { Spinner } from "@/opencut/components/ui/spinner";
import type { ScroSubtitleStyle } from "@/opencut/embed/scro-subtitle-store";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import { cn } from "@/opencut/utils/ui";

// Modal dialog with a textarea that generates an AI subtitle graphic from user-typed text and selected style.
export function ScroOnScreenTextDialog({
	open,
	onOpenChange,
	styles,
	selectedStyle,
	busy,
	error,
	onSelectStyle,
	onGenerate,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	styles: ScroSubtitleStyle[];
	selectedStyle: ScroSubtitleStyle | null;
	busy: boolean;
	error: string | null;
	onSelectStyle: (styleId: string) => void;
	onGenerate: (text: string) => void;
}) {
	const { oc } = useOpencutI18n();
	const [text, setText] = useState("");

	const handleSubmit = () => {
		if (busy) return;
		onGenerate(text);
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
			<DialogContent className="max-w-lg">
				<DialogHeader className="p-4 pr-12 pb-2.5">
					<DialogTitle className="text-base">
						{oc.onScreenText.dialogTitle}
					</DialogTitle>
					<DialogDescription className="text-xs leading-relaxed">
						{oc.onScreenText.dialogDescription}
					</DialogDescription>
				</DialogHeader>

				<DialogBody className="min-w-0 space-y-3 p-4 pt-2">
					{selectedStyle ? (
						<div className="min-w-0 space-y-2">
							<div className="flex items-center justify-between gap-2 text-xs">
								<span className="font-medium text-[#5c6170]">
									{oc.onScreenText.selectedStyleLabel}
								</span>
								<span className="truncate font-semibold text-[#12141c]">
									{selectedStyle.name}
								</span>
							</div>
							<div className="flex items-center justify-center overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#f4f4f5]">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={selectedStyle.previewUrl}
									alt={selectedStyle.name}
									className="aspect-video max-h-44 w-full object-contain"
								/>
							</div>

							{styles.length > 1 ? (
								<div className="flex flex-wrap gap-1.5 pt-0.5">
									{styles.map((style) => {
										const active = style.id === selectedStyle.id;
										return (
											<button
												key={style.id}
												type="button"
												disabled={busy}
												onClick={() => onSelectStyle(style.id)}
												className={cn(
													"cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition",
													active
														? "border-[#12141c] bg-[#12141c] text-white"
														: "border-[#e4e4e7] bg-[#f4f4f5] text-[#5c6170] hover:text-[#12141c]",
												)}
											>
												{style.name}
											</button>
										);
									})}
								</div>
							) : null}
						</div>
					) : null}

					<div className="space-y-1.5">
						<label
							htmlFor="opencut-on-screen-text-input"
							className="block text-xs font-semibold text-[#12141c]"
						>
							{oc.onScreenText.textLabel}
						</label>
						<Textarea
							id="opencut-on-screen-text-input"
							rows={3}
							maxLength={240}
							disabled={busy}
							value={text}
							onChange={(event) => setText(event.currentTarget.value)}
							placeholder={oc.onScreenText.textPlaceholder}
							className="min-h-22 w-full resize-none text-sm"
							onKeyDown={(event) => {
								if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
									event.preventDefault();
									handleSubmit();
								}
							}}
						/>
					</div>

					{error ? (
						<p role="alert" className="text-destructive text-xs font-medium">
							{error}
						</p>
					) : null}
				</DialogBody>

				<DialogFooter className="p-4 py-3">
					<Button
						type="button"
						variant="outline"
						disabled={busy}
						onClick={() => onOpenChange(false)}
					>
						{oc.onScreenText.cancel}
					</Button>
					<Button
						type="button"
						disabled={busy || !text.trim()}
						onClick={handleSubmit}
						className="gap-1.5"
					>
						{busy ? <Spinner className="size-3.5" /> : null}
						<span>
							{busy ? oc.onScreenText.generating : oc.onScreenText.generate}
						</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
