import type { FrameRate, TimeCodeFormat } from "opencut-wasm";

/**
 * Integer-tick time. Mirrors `MediaTime(i64)` in `rust/crates/time/src/media_time.rs`.
 *
 * `opencut-wasm` exposes `MediaTime` as a bare `number` alias because tsify
 * collapses tuple structs. The brand here is the TS-side discipline that
 * recovers the invariant: a `MediaTime` is an integer count of ticks, and the
 * only legal way to construct one from a fractional `number` is `roundMediaTime`
 * (or `mediaTimeFromSeconds`, which rounds inside the wasm boundary).
 *
 * Reading is free — `MediaTime` is assignable to `number`. Writing is gated —
 * a bare `number` is not assignable to `MediaTime`.
 */
export type MediaTime = number & { readonly __mediaTime: unique symbol };

export const TICKS_PER_SECOND = 120_000;

function isMediaTime(value: number): value is MediaTime {
	return Number.isInteger(value);
}

function requireMediaTime({
	value,
	context,
}: {
	value: number;
	context: string;
}): MediaTime {
	if (!isMediaTime(value)) {
		throw new Error(`${context}: expected an integer tick count, got ${value}`);
	}
	return value;
}

export const ZERO_MEDIA_TIME = requireMediaTime({
	value: 0,
	context: "ZERO_MEDIA_TIME",
});

/**
 * Construct a `MediaTime` from a known-integer tick count. Use `roundMediaTime`
 * when the input may be fractional.
 */
export function mediaTime({ ticks }: { ticks: number }): MediaTime {
	return requireMediaTime({
		value: ticks,
		context: "mediaTime()",
	});
}

/**
 * Project a fractional value onto the integer-tick lattice.
 *
 * Rounds half away from zero (`-1.5 → -2`, `1.5 → 2`) and normalises `-0` to
 * `0`. The away-from-zero rule matches Rust's `.round()` and avoids the
 * `Math.round(-0.5) === -0` quirk that propagates `-0` into stored data.
 */
export function roundMediaTime({ time }: { time: number }): MediaTime {
	const roundedMagnitude = Math.round(Math.abs(time));
	if (roundedMagnitude === 0) {
		return ZERO_MEDIA_TIME;
	}
	return requireMediaTime({
		value: time < 0 ? -roundedMagnitude : roundedMagnitude,
		context: "roundMediaTime()",
	});
}

export function mediaTimeFromSeconds({
	seconds,
}: {
	seconds: number;
}): MediaTime {
	if (!Number.isFinite(seconds)) {
		throw new Error(
			`mediaTimeFromSeconds: expected finite seconds, got ${seconds}`,
		);
	}
	return roundMediaTime({ time: seconds * TICKS_PER_SECOND });
}

export function mediaTimeToSeconds({ time }: { time: MediaTime }): number {
	return time / TICKS_PER_SECOND;
}

/**
 * Sum `MediaTime` values. Inputs are integer ticks, so the sum is integer too.
 */
export function addMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return requireMediaTime({
		value: a + b,
		context: "addMediaTime()",
	});
}

export function subMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return requireMediaTime({
		value: a - b,
		context: "subMediaTime()",
	});
}

export function maxMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return a > b ? a : b;
}

export function minMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return a < b ? a : b;
}

export function clampMediaTime({
	time,
	min,
	max,
}: {
	time: MediaTime;
	min: MediaTime;
	max: MediaTime;
}): MediaTime {
	if (time < min) return min;
	if (time > max) return max;
	return time;
}

function frameTicksStep(fps: FrameRate): number {
	if (fps.numerator <= 0 || fps.denominator <= 0) return 1;
	return (TICKS_PER_SECOND * fps.denominator) / fps.numerator;
}

export function roundFrameTime({
	time,
	fps,
}: {
	time: MediaTime;
	fps: FrameRate;
}): MediaTime {
	return roundMediaTime({
		time: roundFrameTicks({ ticks: time, fps }),
	});
}

export function roundFrameTicks({
	ticks,
	fps,
}: {
	ticks: number;
	fps: FrameRate;
}): number {
	const step = frameTicksStep(fps);
	return Math.round(Math.round(ticks / step) * step);
}

export function snapSeekMediaTime({
	time,
	duration,
	fps,
}: {
	time: MediaTime;
	duration: MediaTime;
	fps: FrameRate;
}): MediaTime {
	const clamped = Math.max(0, Math.min(time, Math.max(0, duration)));
	if (clamped >= duration && duration > 0) {
		return duration;
	}
	return roundFrameTime({ time: roundMediaTime({ time: clamped }), fps });
}

export function lastFrameMediaTime({
	duration,
	fps,
}: {
	duration: MediaTime;
	fps: FrameRate;
}): MediaTime {
	if (duration <= 0) return ZERO_MEDIA_TIME;
	const step = frameTicksStep(fps);
	const lastFrameIndex = Math.max(0, Math.floor((duration - 1) / step));
	return roundMediaTime({ time: lastFrameIndex * step });
}

export function parseMediaTimecode({
	timeCode,
	format,
	fps,
}: {
	timeCode: string;
	format: TimeCodeFormat;
	fps: FrameRate;
}): MediaTime | null {
	const parts = timeCode.trim().split(":").map((p) => Number.parseInt(p, 10));
	if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
	const rate = fps.numerator / Math.max(1, fps.denominator);

	if (format === "MM:SS" && parts.length === 2) {
		const [mm, ss] = parts;
		return mediaTimeFromSeconds({ seconds: mm * 60 + ss });
	}
	if (format === "HH:MM:SS" && parts.length === 3) {
		const [hh, mm, ss] = parts;
		return mediaTimeFromSeconds({ seconds: hh * 3600 + mm * 60 + ss });
	}
	if (format === "HH:MM:SS:CS" && parts.length === 4) {
		const [hh, mm, ss, cs] = parts;
		return mediaTimeFromSeconds({
			seconds: hh * 3600 + mm * 60 + ss + cs / 100,
		});
	}
	if (format === "HH:MM:SS:FF" && parts.length === 4) {
		const [hh, mm, ss, ff] = parts;
		return mediaTimeFromSeconds({
			seconds: hh * 3600 + mm * 60 + ss + ff / Math.max(1, rate),
		});
	}
	return null;
}
