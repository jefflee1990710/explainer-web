"use client";

import { useEffect } from "react";
import { DraggableItem } from "@/opencut/components/editor/panels/assets/draggable-item";
import { useEditor } from "@/opencut/editor/use-editor";
import { loadFullFont } from "@/opencut/fonts/google-fonts";
import { SYSTEM_FONTS } from "@/opencut/fonts/system-fonts";
import { TEXT_FONT_PRESETS, type TextFontPreset } from "@/opencut/text/font-presets";
import { buildTextElement } from "@/opencut/timeline/element-utils";
import type { MediaTime } from "@/opencut/wasm";

function quoteFamily(family: string) {
	return `"${family.replace(/"/g, '\\"')}"`;
}

/** Text cards that insert a clip in that Google (or system) font. */
export function TextFontGrid() {
	const editor = useEditor();

	useEffect(() => {
		for (const preset of TEXT_FONT_PRESETS) {
			if (SYSTEM_FONTS.has(preset.family)) continue;
			void loadFullFont({ family: preset.family, weights: preset.weights });
		}
	}, []);

	const addPreset = ({
		preset,
		currentTime,
	}: {
		preset: TextFontPreset;
		currentTime: MediaTime;
	}) => {
		const element = buildTextElement({
			raw: {
				name: preset.family,
				params: {
					content: preset.sample,
					fontFamily: preset.family,
					fontWeight: preset.fontWeight ?? "normal",
				},
			},
			startTime: currentTime,
		});
		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	return (
		<div className="grid grid-cols-2 gap-2 pb-4">
			{TEXT_FONT_PRESETS.map((preset) => (
				<DraggableItem
					key={preset.id}
					name={preset.family}
					containerClassName="w-full"
					preview={
						<div className="bg-accent flex size-full items-center justify-center rounded px-1">
							<span
								className="text-center text-base leading-tight select-none"
								style={{
									fontFamily: `${quoteFamily(preset.family)}, sans-serif`,
									fontWeight: preset.fontWeight === "bold" ? 700 : 400,
								}}
							>
								{preset.sample}
							</span>
						</div>
					}
					dragData={{
						id: `text-${preset.id}`,
						type: "text",
						name: preset.family,
						content: preset.sample,
						fontFamily: preset.family,
						fontWeight: preset.fontWeight ?? "normal",
					}}
					aspectRatio={1.4}
					onAddToTimeline={({ currentTime }) => addPreset({ preset, currentTime })}
				/>
			))}
		</div>
	);
}
