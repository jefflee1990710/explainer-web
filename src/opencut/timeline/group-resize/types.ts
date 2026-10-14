import type { FrameRate } from "opencut-wasm";
import type { ElementRef, RetimeConfig } from "@/opencut/timeline/types";
import type { MediaTime } from "@/opencut/wasm";

export type ResizeSide = "left" | "right";

export interface GroupResizeMember extends ElementRef {
	startTime: MediaTime;
	duration: MediaTime;
	trimStart: MediaTime;
	trimEnd: MediaTime;
	sourceDuration?: MediaTime;
	retime?: RetimeConfig;
	leftNeighborBound: MediaTime | null;
	rightNeighborBound: MediaTime | null;
	/** Transition glued to a clip head: the left edge does not move. */
	fixedStart?: boolean;
	/** Transition glued to a clip tail: the right edge does not move. */
	fixedEnd?: boolean;
	/** Left edge cannot move past this time (the cut, or the glued head). */
	maxStart?: MediaTime;
	/** Right edge cannot move past this time (the cut, or the glued tail). */
	minEnd?: MediaTime;
}

export interface GroupResizeUpdate extends ElementRef {
	patch: {
		trimStart: MediaTime;
		trimEnd: MediaTime;
		startTime: MediaTime;
		duration: MediaTime;
	};
}

export interface GroupResizeResult {
	deltaTime: MediaTime;
	updates: GroupResizeUpdate[];
}

export interface ComputeGroupResizeArgs {
	members: GroupResizeMember[];
	side: ResizeSide;
	deltaTime: MediaTime;
	fps: FrameRate;
}
