"use client";

import { cn } from "@/opencut/utils/ui";

export type SubtitleStyleCard = {
	id: string;
	name: string;
	previewUrl: string;
};

// Style previews as cards. Clicking one picks the look used by Generate.
export function ScroSubtitleStyleGrid({
	styles,
	selectedId,
	label,
	onSelect,
}: {
	styles: SubtitleStyleCard[];
	selectedId: string;
	label: string;
	onSelect: (id: string) => void;
}) {
	return (
		<div className="mt-3 grid grid-cols-2 gap-2" role="listbox" aria-label={label}>
			{styles.map((style) => {
				const active = style.id === selectedId;
				return (
					<button
						key={style.id}
						type="button"
						role="option"
						aria-selected={active}
						onClick={() => onSelect(style.id)}
						className={cn(
							"flex flex-col gap-1 rounded-md p-1 text-left",
							active ? "bg-secondary" : "hover:bg-muted",
						)}
					>
						<img
							src={style.previewUrl}
							alt=""
							className="bg-muted aspect-video w-full rounded-sm object-cover"
						/>
						<span className="truncate px-0.5 text-xs">{style.name}</span>
					</button>
				);
			})}
		</div>
	);
}
