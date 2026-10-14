"use client";

import { useEffect, useRef } from "react";
import { registerDefaultEffects } from "@/opencut/effects";
import { effectPreviewService } from "@/opencut/services/renderer/effect-preview";

const LOOP_MS = 1400;
const FRAME_MS = 80;
/** Halfway through the rise, so the still shows the effect without covering the photo. */
const STILL_PROGRESS = 0.28;

const listeners = new Set<(now: number) => void>();
let sharedFrame = 0;

/** One clock, started only while at least one card is hovered. */
function watchPreviewClock(listener: (now: number) => void): () => void {
	listeners.add(listener);
	if (sharedFrame === 0) {
		const tick = (now: number) => {
			sharedFrame = requestAnimationFrame(tick);
			for (const current of listeners) current(now);
		};
		sharedFrame = requestAnimationFrame(tick);
	}
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			cancelAnimationFrame(sharedFrame);
			sharedFrame = 0;
		}
	};
}

/** Still preview until the pointer is over the card, then it loops. */
export function TransitionGifThumb({ type }: { type: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		registerDefaultEffects();
		const node = canvasRef.current;
		if (!node) return;

		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const card = node.closest(".group") ?? node;
		let playing = false;
		let last = 0;
		let stopClock: (() => void) | null = null;

		const paint = (progress: number) => {
			effectPreviewService.renderPreview({
				effectType: type,
				params: { progress, amount: 100 },
				targetCanvas: node,
			});
		};

		const stop = () => {
			stopClock?.();
			stopClock = null;
			last = 0;
		};

		const play = () => {
			if (reduced || stopClock) return;
			stopClock = watchPreviewClock((now) => {
				if (now - last < FRAME_MS) return;
				last = now;
				paint((now % LOOP_MS) / LOOP_MS);
			});
		};

		const onEnter = () => {
			playing = true;
			play();
		};
		const onLeave = () => {
			playing = false;
			stop();
			paint(STILL_PROGRESS);
		};

		paint(STILL_PROGRESS);
		card.addEventListener("pointerenter", onEnter);
		card.addEventListener("pointerleave", onLeave);
		const stopReady = effectPreviewService.onPreviewImageReady({
			callback: () => {
				if (!playing) paint(STILL_PROGRESS);
			},
		});

		return () => {
			stop();
			stopReady();
			card.removeEventListener("pointerenter", onEnter);
			card.removeEventListener("pointerleave", onLeave);
		};
	}, [type]);

	return <canvas ref={canvasRef} className="size-full" />;
}
