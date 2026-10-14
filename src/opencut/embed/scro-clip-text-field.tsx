"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/opencut/utils/ui";

// Collapsed storyboard text. The full paragraph stays one click away.
export function ScroClipTextField({ label, text }: { label: string; text: string }) {
	const paragraph = useRef<HTMLParagraphElement>(null);
	const [open, setOpen] = useState(false);
	const [overflows, setOverflows] = useState(false);

	useLayoutEffect(() => {
		setOpen(false);
	}, [text]);

	useLayoutEffect(() => {
		const node = paragraph.current;
		if (!node || open) return;
		setOverflows(node.scrollHeight > node.clientHeight + 1);
	}, [text, open]);

	return (
		<div className="space-y-1">
			<div className="text-muted-foreground text-[0.65rem] font-medium tracking-wide uppercase">
				{label}
			</div>
			<p
				ref={paragraph}
				className={cn(
					"text-foreground text-xs leading-relaxed whitespace-pre-wrap",
					!open && "line-clamp-4",
				)}
			>
				{text}
			</p>
			{overflows ? (
				<button
					type="button"
					aria-expanded={open}
					onClick={() => setOpen((value) => !value)}
					className="text-muted-foreground hover:text-foreground text-left text-[0.65rem] font-medium"
				>
					{open ? "Show less" : "Show more"}
				</button>
			) : null}
		</div>
	);
}
