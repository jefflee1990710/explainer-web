/** A clip's visible range, in seconds. */
export type ClipSpan = {
	start: number;
	end: number;
};

/** Effect placement relative to a clip: the cut, the head, or the tail. */
export type EffectAnchorKind = "between" | "start" | "end";

export type AnchoredEffectSpan = {
	kind: EffectAnchorKind;
	start: number;
	duration: number;
};

/** Head, tail, and cross-cut effects cover up to one second. */
const EDGE_SECONDS = 1;
/** Clips this close count as one cut. */
const JOIN_GAP_SECONDS = 0.25;
/** Dropping this close to a joined cut places the effect across the cut. */
const BETWEEN_WINDOW_SECONDS = 0.45;

type Candidate = AnchoredEffectSpan & {
	distance: number;
	rank: number;
};

/**
 * Snap a time to the nearest clip-relative effect span.
 * Each inner array is one track, so cuts are only between clips on that track.
 * `edgeOnly` rejects a time that is not already on a head, tail, or cut.
 * Returns null when every track is empty, or when `edgeOnly` finds no edge.
 */
export function anchorEffectToClips({
	time,
	tracks,
	edgeOnly = false,
}: {
	time: number;
	tracks: ClipSpan[][];
	edgeOnly?: boolean;
}): AnchoredEffectSpan | null {
	let best: Candidate | null = null;
	for (const track of tracks) {
		const candidate = anchorOnTrack({ time, clips: track });
		if (!candidate) continue;
		if (edgeOnly && !isOnEdge({ candidate })) continue;
		if (!best || isCloser({ candidate, best })) best = candidate;
	}
	if (!best) return null;
	return { kind: best.kind, start: best.start, duration: best.duration };
}

/** True when the pointer is inside the head, tail, or the cut window. */
function isOnEdge({ candidate }: { candidate: Candidate }): boolean {
	if (candidate.kind === "between") {
		return candidate.distance <= Math.max(BETWEEN_WINDOW_SECONDS, JOIN_GAP_SECONDS);
	}
	return candidate.distance <= candidate.duration;
}

function anchorOnTrack({
	time,
	clips,
}: {
	time: number;
	clips: ClipSpan[];
}): Candidate | null {
	const sorted = clips
		.filter((clip) => clip.end - clip.start > 1e-4)
		.sort((a, b) => a.start - b.start);
	if (sorted.length === 0) return null;

	const index = sorted.findIndex((clip) => clip.start <= time && time < clip.end);
	if (index >= 0) {
		return anchorInsideClip({ time, clips: sorted, index });
	}

	if (time < sorted[0].start) {
		return startCandidate({ time, clip: sorted[0] });
	}

	const last = sorted[sorted.length - 1];
	if (time >= last.end) {
		return endCandidate({ time, clip: last });
	}

	for (let i = 0; i < sorted.length - 1; i++) {
		const previous = sorted[i];
		const next = sorted[i + 1];
		if (time < previous.end || time >= next.start) continue;
		if (next.start - previous.end <= JOIN_GAP_SECONDS) {
			return betweenCandidate({ time, cut: joinCut({ previous, next }) });
		}
		const closerToPrevious = time - previous.end <= next.start - time;
		return closerToPrevious
			? endCandidate({ time, clip: previous })
			: startCandidate({ time, clip: next });
	}

	return null;
}

function anchorInsideClip({
	time,
	clips,
	index,
}: {
	time: number;
	clips: ClipSpan[];
	index: number;
}): Candidate {
	const clip = clips[index];
	const duration = clip.end - clip.start;
	const window = Math.min(BETWEEN_WINDOW_SECONDS, duration * 0.3);
	const previous = index > 0 ? clips[index - 1] : null;
	const next = index < clips.length - 1 ? clips[index + 1] : null;
	const joinedPrevious = !!previous && clip.start - previous.end <= JOIN_GAP_SECONDS;
	const joinedNext = !!next && next.start - clip.end <= JOIN_GAP_SECONDS;

	if (joinedPrevious && previous && time - clip.start <= window) {
		return betweenCandidate({ time, cut: joinCut({ previous, next: clip }) });
	}
	if (joinedNext && next && clip.end - time <= window) {
		return betweenCandidate({ time, cut: joinCut({ previous: clip, next }) });
	}
	if (time - clip.start <= clip.end - time) {
		return startCandidate({ time, clip });
	}
	return endCandidate({ time, clip });
}

function startCandidate({
	time,
	clip,
}: {
	time: number;
	clip: ClipSpan;
}): Candidate {
	const duration = edgeDuration({ clip });
	return {
		kind: "start",
		start: clip.start,
		duration,
		distance: Math.abs(time - clip.start),
		rank: 1,
	};
}

function endCandidate({
	time,
	clip,
}: {
	time: number;
	clip: ClipSpan;
}): Candidate {
	const duration = edgeDuration({ clip });
	return {
		kind: "end",
		start: clip.end - duration,
		duration,
		distance: Math.abs(time - clip.end),
		rank: 2,
	};
}

function betweenCandidate({ time, cut }: { time: number; cut: number }): Candidate {
	return {
		kind: "between",
		start: Math.max(0, cut - EDGE_SECONDS / 2),
		duration: EDGE_SECONDS,
		distance: Math.abs(time - cut),
		rank: 0,
	};
}

function edgeDuration({ clip }: { clip: ClipSpan }): number {
	const duration = clip.end - clip.start;
	if (duration <= EDGE_SECONDS * 2) return duration / 2;
	return EDGE_SECONDS;
}

function joinCut({
	previous,
	next,
}: {
	previous: ClipSpan;
	next: ClipSpan;
}): number {
	return (previous.end + next.start) / 2;
}

/**
 * One transition on every clip-to-clip join, plus the tail of the last clip.
 * A wide gap uses the outgoing clip's tail instead of a centered cut.
 */
export function listApplyAllTransitionSlots(
	clips: ClipSpan[],
): Array<{ start: number; duration: number }> {
	const sorted = clips
		.filter((clip) => clip.end - clip.start > 1e-4)
		.sort((a, b) => a.start - b.start);
	if (sorted.length === 0) return [];

	const slots: Array<{ start: number; duration: number }> = [];
	for (let i = 0; i < sorted.length - 1; i++) {
		const previous = sorted[i];
		const next = sorted[i + 1];
		if (next.start - previous.end <= JOIN_GAP_SECONDS) {
			slots.push(betweenSpan({ previous, next }));
		} else {
			const duration = edgeDuration({ clip: previous });
			slots.push({ start: previous.end - duration, duration });
		}
	}
	const last = sorted[sorted.length - 1];
	const duration = edgeDuration({ clip: last });
	slots.push({ start: last.end - duration, duration });
	return packSlots(slots);
}

/** Keep earlier slots when a short clip would stack two transitions. */
function packSlots(
	slots: Array<{ start: number; duration: number }>,
): Array<{ start: number; duration: number }> {
	const kept: Array<{ start: number; duration: number }> = [];
	for (const slot of slots) {
		const overlaps = kept.some(
			(existing) =>
				slot.start < existing.start + existing.duration - 1e-4 &&
				slot.start + slot.duration > existing.start + 1e-4,
		);
		if (!overlaps) kept.push(slot);
	}
	return kept;
}

function betweenSpan({
	previous,
	next,
}: {
	previous: ClipSpan;
	next: ClipSpan;
}): { start: number; duration: number } {
	const cut = joinCut({ previous, next });
	const half = Math.min(
		EDGE_SECONDS / 2,
		(previous.end - previous.start) / 2,
		(next.end - next.start) / 2,
	);
	return { start: Math.max(0, cut - half), duration: half * 2 };
}

function isCloser({
	candidate,
	best,
}: {
	candidate: Candidate;
	best: Candidate;
}): boolean {
	if (Math.abs(candidate.distance - best.distance) > 1e-6) {
		return candidate.distance < best.distance;
	}
	return candidate.rank < best.rank;
}
