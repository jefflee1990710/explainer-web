"use client";

import { useEffect, useRef, useState } from "react";
import { TransitionGifThumb } from "@/opencut/effects/components/transition-gif-thumb";
import { editorPreviewSrc } from "@/opencut/effects/preview-art";
import { effectPreviewService } from "@/opencut/services/renderer/effect-preview";

/** Gemini still for the card. Falls back to a live shader render if the file is missing. */
export function CatalogThumb({
	category,
	type,
}: {
	category: string;
	type: string;
}) {
	const [failed, setFailed] = useState(false);
	if (category === "transition") {
		return <TransitionGifThumb type={type} />;
	}
	if (failed) {
		return <LiveEffectThumb effectType={type} />;
	}
	return (
		<img
			src={editorPreviewSrc({ category, type })}
			alt=""
			className="size-full object-cover"
			onError={() => setFailed(true)}
		/>
	);
}

function LiveEffectThumb({
	effectType,
	progress,
}: {
	effectType: string;
	progress?: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const render = () => {
			if (!canvasRef.current) return;
			effectPreviewService.renderPreview({
				effectType,
				params: progress == null ? {} : { progress, amount: 100 },
				targetCanvas: canvasRef.current,
			});
		};
		render();
		return effectPreviewService.onPreviewImageReady({ callback: render });
	}, [effectType, progress]);

	return <canvas ref={canvasRef} className="size-full" />;
}
