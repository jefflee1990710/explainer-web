import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	reconcileTransitionsWithVideoTracks,
	upsertTransitionElementInTracks,
} from "@/opencut/effects/apply-all-transitions";
import { registerDefaultEffects, effectsRegistry, resolveEffectPasses } from "@/opencut/effects";
import { buildEffectElement, buildTextElement } from "@/opencut/timeline/element-utils";
import { computeDropTarget, getDropLineY } from "@/opencut/timeline/components/drop-target";
import { KEYFRAME_LANE_HEIGHT_PX, TIMELINE_TRACK_GAP_PX } from "@/opencut/timeline/components/layout";
import { getTrackHeight } from "@/opencut/timeline/components/track-layout";
import { buildScene } from "@/opencut/services/renderer/scene-builder";
import { EffectLayerNode } from "@/opencut/services/renderer/nodes/effect-layer-node";
import { TextNode } from "@/opencut/services/renderer/nodes/text-node";
import { VideoNode } from "@/opencut/services/renderer/nodes/video-node";
import type { SceneTracks, TextElement, VideoElement } from "@/opencut/timeline";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	ZERO_MEDIA_TIME,
} from "@/opencut/wasm";

function makeVideoElement({
	id,
	startSec,
	durationSec,
}: {
	id: string;
	startSec: number;
	durationSec: number;
}): VideoElement {
	return {
		id,
		name: id,
		type: "video",
		mediaId: "media-1",
		startTime: mediaTimeFromSeconds({ seconds: startSec }),
		duration: mediaTimeFromSeconds({ seconds: durationSec }),
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
		params: {},
	};
}

function makeTracks(clips: VideoElement[]): SceneTracks {
	return {
		overlay: [],
		main: {
			id: "main-track",
			name: "Main",
			type: "video",
			elements: clips,
			muted: false,
			hidden: false,
		},
		audio: [],
	};
}

describe("Transition placement & reconciliation", () => {
	it("refuses to insert a transition when the timeline has no video clips", () => {
		const emptyTracks = makeTracks([]);
		const transition = {
			...buildEffectElement({
				effectType: "dip",
				startTime: mediaTimeFromSeconds({ seconds: 0 }),
				duration: mediaTimeFromSeconds({ seconds: 1 }),
			}),
			id: "tr-1",
		};
		const result = upsertTransitionElementInTracks({
			tracks: emptyTracks,
			element: transition,
		});
		assert.equal(result, null);
	});

	it("replaces an existing transition at the same cut instead of stacking a second track", () => {
		const tracks = makeTracks([
			makeVideoElement({ id: "v1", startSec: 0, durationSec: 5 }),
			makeVideoElement({ id: "v2", startSec: 5, durationSec: 5 }),
		]);
		const first = {
			...buildEffectElement({
				effectType: "dip",
				startTime: mediaTimeFromSeconds({ seconds: 4.5 }),
				duration: mediaTimeFromSeconds({ seconds: 1 }),
			}),
			id: "tr-1",
		};
		const second = {
			...buildEffectElement({
				effectType: "wipe",
				startTime: mediaTimeFromSeconds({ seconds: 4.5 }),
				duration: mediaTimeFromSeconds({ seconds: 1 }),
			}),
			id: "tr-2",
		};

		const afterFirst = upsertTransitionElementInTracks({
			tracks,
			element: first,
		});
		assert.ok(afterFirst);
		const afterSecond = upsertTransitionElementInTracks({
			tracks: afterFirst,
			element: second,
		});
		assert.ok(afterSecond);

		const effectTracks = afterSecond.overlay.filter((t) => t.type === "effect");
		assert.equal(effectTracks.length, 1);
		assert.equal(effectTracks[0].elements.length, 1);
		assert.equal(effectTracks[0].elements[0].effectType, "wipe");
	});

	it("re-anchors an orphaned mid-clip transition when video clips change, while preserving valid resized transitions", () => {
		const tracks = makeTracks([
			makeVideoElement({ id: "v1", startSec: 0, durationSec: 8 }),
			makeVideoElement({ id: "v2", startSec: 8, durationSec: 8 }),
		]);
		const withTransitions: SceneTracks = {
			...tracks,
			overlay: [
				{
					id: "eff-track",
					name: "Effects",
					type: "effect",
					hidden: false,
					elements: [
						{
							...buildEffectElement({
								effectType: "dip",
								startTime: mediaTimeFromSeconds({ seconds: 0 }),
								duration: mediaTimeFromSeconds({ seconds: 2 }),
							}),
							id: "tr-valid-head",
						},
						{
							...buildEffectElement({
								effectType: "flash",
								startTime: mediaTimeFromSeconds({ seconds: 4.5 }),
								duration: mediaTimeFromSeconds({ seconds: 1 }),
							}),
							id: "tr-orphaned",
						},
					],
				},
			],
		};

		const reconciled = reconcileTransitionsWithVideoTracks({
			tracks: withTransitions,
		});
		const effElements = reconciled.overlay.find((t) => t.type === "effect")?.elements ?? [];
		assert.equal(effElements.length, 2);

		const head = effElements.find((e) => e.id === "tr-valid-head")!;
		assert.equal(mediaTimeToSeconds({ time: head.startTime }), 0);
		assert.equal(mediaTimeToSeconds({ time: head.duration }), 2);

		const reanchored = effElements.find((e) => e.id === "tr-orphaned")!;
		const reanchoredStart = mediaTimeToSeconds({ time: reanchored.startTime });
		assert.ok(
			Math.abs(reanchoredStart - 7) < 1e-3 || Math.abs(reanchoredStart - 7.5) < 1e-3,
			`Expected orphaned transition to snap to clip end/cut, got start=${reanchoredStart}`,
		);
	});
});

describe("Scene builder transition z-order", () => {
	it("places transition EffectLayerNodes above video nodes but below subtitle TextNodes", () => {
		const video = makeVideoElement({ id: "v1", startSec: 0, durationSec: 5 });
		const subtitle: TextElement = {
			...(buildTextElement({
				raw: { name: "Sub", params: { content: "Hello" } },
				startTime: mediaTimeFromSeconds({ seconds: 0 }),
			}) as Omit<TextElement, "id">),
			id: "sub-1",
		};
		const transition = {
			...buildEffectElement({
				effectType: "dip",
				startTime: mediaTimeFromSeconds({ seconds: 0 }),
				duration: mediaTimeFromSeconds({ seconds: 1 }),
			}),
			id: "tr-1",
		};

		const tracks: SceneTracks = {
			overlay: [
				{
					id: "eff-track",
					name: "Effects",
					type: "effect",
					hidden: false,
					elements: [transition],
				},
				{
					id: "text-track",
					name: "Subtitles",
					type: "text",
					hidden: false,
					elements: [subtitle],
				},
			],
			main: {
				id: "main-track",
				name: "Main",
				type: "video",
				elements: [video],
				muted: false,
				hidden: false,
			},
			audio: [],
		};

		const root = buildScene({
			canvasSize: { width: 1080, height: 1920 },
			tracks,
			mediaAssets: [
				{
					id: "media-1",
					name: "clip.mp4",
					type: "video",
					url: "blob:test",
					file: new File([], "clip.mp4"),
					duration: 5,
				},
			],
			duration: 5,
			background: { type: "color", color: "#000000" },
		});

		const videoIdx = root.children.findIndex((n) => n instanceof VideoNode);
		const transitionIdx = root.children.findIndex((n) => n instanceof EffectLayerNode);
		const textIdx = root.children.findIndex((n) => n instanceof TextNode);

		assert.ok(videoIdx >= 0 && transitionIdx >= 0 && textIdx >= 0);
		assert.ok(
			videoIdx < transitionIdx && transitionIdx < textIdx,
			`Expected video (${videoIdx}) < transition (${transitionIdx}) < text (${textIdx})`,
		);
	});
});

describe("Deterministic film grain seed", () => {
	it("uses a deterministic u_seed for the same frame time and varies across frames", () => {
		registerDefaultEffects();
		const grain = effectsRegistry.get("grain");
		const passA1 = resolveEffectPasses({
			definition: grain,
			effectParams: { amount: 45, __time: 1.0 },
			width: 1080,
			height: 1920,
		});
		const passA2 = resolveEffectPasses({
			definition: grain,
			effectParams: { amount: 45, __time: 1.0 },
			width: 1080,
			height: 1920,
		});
		const passB = resolveEffectPasses({
			definition: grain,
			effectParams: { amount: 45, __time: 1.5 },
			width: 1080,
			height: 1920,
		});

		assert.equal(passA1[0].uniforms.u_seed, passA2[0].uniforms.u_seed);
		assert.notEqual(passA1[0].uniforms.u_seed, passB[0].uniforms.u_seed);
	});
});

describe("Drop target Y calculation with expanded keyframe lanes", () => {
	it("accounts for expanded keyframe rows when computing getDropLineY and computeDropTarget", () => {
		const videoWithKeyframes: VideoElement = {
			...makeVideoElement({ id: "v-expanded", startSec: 0, durationSec: 5 }),
			animations: {
				opacity: {
					keys: [
						{
							id: "kf-1",
							time: ZERO_MEDIA_TIME,
							value: 1,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
					],
				},
				"transform.scaleX": {
					keys: [
						{
							id: "kf-2",
							time: ZERO_MEDIA_TIME,
							value: 1,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
					],
				},
			},
		};
		const tracks: SceneTracks = {
			overlay: [
				{
					id: "ov-1",
					name: "Overlay Video",
					type: "video",
					hidden: false,
					muted: false,
					elements: [videoWithKeyframes],
				},
			],
			main: {
				id: "main-track",
				name: "Main",
				type: "video",
				elements: [makeVideoElement({ id: "v-main", startSec: 0, durationSec: 5 })],
				muted: false,
				hidden: false,
			},
			audio: [],
		};

		const expandedIds = new Set(["v-expanded"]);
		const allTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
		const baseVideoHeight = getTrackHeight({ type: "video" });
		const expectedExpansion = 2 * KEYFRAME_LANE_HEIGHT_PX;

		const lineY = getDropLineY({
			dropTarget: {
				trackIndex: 1,
				isNewTrack: false,
				insertPosition: null,
				xPosition: ZERO_MEDIA_TIME,
				targetElement: null,
			},
			tracks: allTracks,
			expandedElementIds: expandedIds,
		});
		assert.equal(lineY, baseVideoHeight + expectedExpansion + TIMELINE_TRACK_GAP_PX);

		// A mouseY inside the expanded keyframe area of track 0 should still hit track 0, not track 1
		const targetInExpanded = computeDropTarget({
			elementType: "video",
			mouseX: 100,
			mouseY: baseVideoHeight + KEYFRAME_LANE_HEIGHT_PX,
			tracks,
			playheadTime: ZERO_MEDIA_TIME,
			isExternalDrop: false,
			elementDuration: mediaTimeFromSeconds({ seconds: 2 }),
			pixelsPerSecond: 100,
			zoomLevel: 1,
			targetElementTypes: ["video"],
			expandedElementIds: expandedIds,
		});
		assert.equal(targetInExpanded.targetElement?.elementId, "v-expanded");
	});
});
