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
 * Opening heading, every clip-to-clip join, and the closing tail.
 * A wide gap cannot hold one centered cut, so the outgoing tail and the
 * next clip's heading each get their own transition.
 */
export function listApplyAllTransitionSlots(
	clips: ClipSpan[],
): Array<{ start: number; duration: number }> {
	const sorted = clips
		.filter((clip) => clip.end - clip.start > 1e-4)
		.sort((a, b) => a.start - b.start);
	if (sorted.length === 0) return [];

	const slots: Array<{ start: number; duration: number }> = [
		headSpan({ clip: sorted[0] }),
	];
	for (let i = 0; i < sorted.length - 1; i++) {
		const previous = sorted[i];
		const next = sorted[i + 1];
		if (next.start - previous.end <= JOIN_GAP_SECONDS) {
			slots.push(betweenSpan({ previous, next }));
		} else {
			slots.push(tailSpan({ clip: previous }));
			slots.push(headSpan({ clip: next }));
		}
	}
	slots.push(tailSpan({ clip: sorted[sorted.length - 1] }));
	return packTransitionSlots(slots);
}

/**
 * Heading, cuts, and ending for every picture row.
 * Cuts stay inside one row. A later row only adds a slot that does not cover an earlier one.
 */
export function listPictureTransitionSlots(
	rows: ClipSpan[][],
): Array<{ start: number; duration: number }> {
	return packTransitionSlots(rows.flatMap((row) => listApplyAllTransitionSlots(row)));
}

function headSpan({ clip }: { clip: ClipSpan }): { start: number; duration: number } {
	return { start: clip.start, duration: edgeDuration({ clip }) };
}

function tailSpan({ clip }: { clip: ClipSpan }): { start: number; duration: number } {
	const duration = edgeDuration({ clip });
	return { start: clip.end - duration, duration };
}

/** Keep earlier slots when a short clip would stack two transitions. */
export function packTransitionSlots(
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

const EDGE_MATCH_SECONDS = 0.08;

export type TransitionResizeLimits = {
	/** Head of a clip: the left edge stays put. */
	fixedStart: boolean;
	/** Tail of a clip: the right edge stays put. */
	fixedEnd: boolean;
	minStart: number;
	maxEnd: number;
	/** Left edge cannot pass this time. */
	maxStart: number;
	/** Right edge cannot pass this time. */
	minEnd: number;
};

/**
 * How far a transition already on an edge may be resized.
 * The glued edge stays on the head, tail, or cut. The free edge stops at the clip.
 */
export function transitionResizeLimits({
	start,
	duration,
	clips,
}: {
	start: number;
	duration: number;
	clips: ClipSpan[];
}): TransitionResizeLimits | null {
	const sorted = sortedClips(clips);
	if (sorted.length === 0 || duration <= 1e-4) return null;
	const end = start + duration;
	const cut = cutCoveredBy({ start, end, clips: sorted });
	if (cut) {
		return {
			fixedStart: false,
			fixedEnd: false,
			minStart: cut.previous.start,
			maxEnd: cut.next.end,
			maxStart: cut.time,
			minEnd: cut.time,
		};
	}
	const head = sorted.find(
		(clip) =>
			Math.abs(clip.start - start) <= EDGE_MATCH_SECONDS &&
			end <= clip.end + EDGE_MATCH_SECONDS,
	);
	if (head) {
		return {
			fixedStart: true,
			fixedEnd: false,
			minStart: head.start,
			maxEnd: head.end,
			maxStart: head.start,
			minEnd: head.start,
		};
	}
	const tail = sorted.find(
		(clip) =>
			Math.abs(clip.end - end) <= EDGE_MATCH_SECONDS &&
			start >= clip.start - EDGE_MATCH_SECONDS,
	);
	if (tail) {
		return {
			fixedStart: false,
			fixedEnd: true,
			minStart: tail.start,
			maxEnd: tail.end,
			maxStart: tail.end,
			minEnd: tail.end,
		};
	}
	return null;
}

/**
 * Snap `duration` onto the nearest head, tail, or cut.
 * A longer block keeps its length instead of collapsing back to one second.
 */
export function placeTransitionWithDuration({
	time,
	clips,
	duration,
}: {
	time: number;
	clips: ClipSpan[];
	duration: number;
}): { start: number; duration: number } | null {
	const span = anchorEffectToClips({ time, tracks: [clips] });
	if (!span) return null;
	const sorted = sortedClips(clips);
	const requested = Math.max(duration, 1 / 30);
	if (span.kind === "start") {
		const clip = sorted.find((item) => Math.abs(item.start - span.start) < 1e-3);
		if (!clip) return { start: span.start, duration: span.duration };
		const next = Math.min(requested, clip.end - clip.start);
		return { start: clip.start, duration: next };
	}
	if (span.kind === "end") {
		const clipEnd = span.start + span.duration;
		const clip = sorted.find((item) => Math.abs(item.end - clipEnd) < 1e-2);
		if (!clip) return { start: span.start, duration: span.duration };
		const next = Math.min(requested, clip.end - clip.start);
		return { start: clip.end - next, duration: next };
	}
	const cut = span.start + span.duration / 2;
	const pair = joinedPairAt({ cut, clips: sorted });
	if (!pair) return { start: span.start, duration: span.duration };
	const left = Math.min(requested / 2, cut - pair.previous.start);
	const right = Math.min(requested / 2, pair.next.end - cut);
	return { start: Math.max(0, cut - left), duration: left + right };
}

function sortedClips(clips: ClipSpan[]): ClipSpan[] {
	return clips
		.filter((clip) => clip.end - clip.start > 1e-4)
		.sort((a, b) => a.start - b.start);
}

/** A join the block still covers, so resizing cannot slide off the cut. */
function cutCoveredBy({
	start,
	end,
	clips,
}: {
	start: number;
	end: number;
	clips: ClipSpan[];
}): { time: number; previous: ClipSpan; next: ClipSpan } | null {
	for (let i = 0; i < clips.length - 1; i++) {
		const previous = clips[i];
		const next = clips[i + 1];
		if (next.start - previous.end > JOIN_GAP_SECONDS) continue;
		const time = joinCut({ previous, next });
		if (time > start + EDGE_MATCH_SECONDS && time < end - EDGE_MATCH_SECONDS) {
			return { time, previous, next };
		}
	}
	return null;
}

function joinedPairAt({
	cut,
	clips,
}: {
	cut: number;
	clips: ClipSpan[];
}): { previous: ClipSpan; next: ClipSpan } | null {
	for (let i = 0; i < clips.length - 1; i++) {
		const previous = clips[i];
		const next = clips[i + 1];
		if (next.start - previous.end > JOIN_GAP_SECONDS) continue;
		if (Math.abs(joinCut({ previous, next }) - cut) <= 0.2) {
			return { previous, next };
		}
	}
	return null;
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
