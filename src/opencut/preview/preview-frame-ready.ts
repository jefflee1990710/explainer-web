/** A channel at or below this is the uncleared preview background. */
export const PREVIEW_EMPTY_CHANNEL = 16;

/** How long a still-blank canvas may keep the spinner before the frame is shown anyway. */
export const PREVIEW_EMPTY_HOLD_MS = 8000;

/** A packed breath between clips. Hold the last picture instead of flashing black. */
export const PREVIEW_HOLD_GAP_SECONDS = 0.45;

const SAMPLE_SIZE = 8;

export type PreviewSampleRect = { x: number; y: number; size: number };

/**
 * Nine probes inset from the edges.
 * An unloaded canvas is black at every probe. A dark subject usually is not.
 */
export function previewSampleRects(width: number, height: number): PreviewSampleRect[] {
	if (width < 1 || height < 1) return [];
	const size = Math.min(SAMPLE_SIZE, width, height);
	const rects: PreviewSampleRect[] = [];
	for (const yRatio of [0.2, 0.5, 0.8]) {
		for (const xRatio of [0.2, 0.5, 0.8]) {
			rects.push({
				x: Math.min(width - size, Math.max(0, Math.round(width * xRatio - size / 2))),
				y: Math.min(height - size, Math.max(0, Math.round(height * yRatio - size / 2))),
				size,
			});
		}
	}
	return rects;
}

/** True when any pixel in the probe is brighter than the empty background. */
export function rgbaRegionIsPainted(data: ArrayLike<number>): boolean {
	for (let index = 0; index < data.length; index += 4) {
		if (
			data[index] > PREVIEW_EMPTY_CHANNEL ||
			data[index + 1] > PREVIEW_EMPTY_CHANNEL ||
			data[index + 2] > PREVIEW_EMPTY_CHANNEL
		) {
			return true;
		}
	}
	return false;
}

/**
 * The spinner covers the preview only until the first painted frame.
 * A later black subject, such as a laptop screen, stays visible.
 */
export function previewLoadDecision({
	seenFrame,
	painted,
	emptyForMs,
}: {
	seenFrame: boolean;
	painted: boolean;
	emptyForMs: number;
}): { seenFrame: boolean; showLoading: boolean; retry: boolean } {
	if (seenFrame || painted) {
		return { seenFrame: true, showLoading: false, retry: false };
	}
	if (emptyForMs < PREVIEW_EMPTY_HOLD_MS) {
		return { seenFrame: false, showLoading: true, retry: true };
	}
	return { seenFrame: false, showLoading: false, retry: false };
}

/**
 * The spinner is only for the first frame. A later clip, including a short
 * gap between clips, keeps the picture that is already on screen.
 */
export function previewClipHandoff({
	seenFrame,
	mediaChanged,
	inGap,
	gapSeconds,
}: {
	seenFrame: boolean;
	mediaChanged: boolean;
	inGap: boolean;
	gapSeconds: number;
}): { resetSeenFrame: boolean; holdLastFrame: boolean } {
	if (!seenFrame) {
		return { resetSeenFrame: mediaChanged, holdLastFrame: false };
	}
	return {
		resetSeenFrame: false,
		holdLastFrame:
			inGap && gapSeconds > 0 && gapSeconds <= PREVIEW_HOLD_GAP_SECONDS,
	};
}
