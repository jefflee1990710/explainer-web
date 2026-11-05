"use client";

import type { ElementAnimations } from "@/opencut/animation/types";
import type { EditorCore } from "@/opencut/core";
import { isTransitionElement } from "@/opencut/effects/transition-layout";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { matchSubtitleSlots } from "@/opencut/embed/scro-subtitle-slots";
import { getScroVideos } from "@/opencut/embed/scro-video-store";
import type { SceneTracks } from "@/opencut/timeline";
import { buildLibraryAudioElement } from "@/opencut/timeline/element-utils";
import { generateUUID } from "@/opencut/utils/id";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";
import {
	autoPlanOpencutBgmAction,
	autoPlanOpencutSfxAction,
} from "@/presentation/actions/opencut-auto-audio";
import {
	AI_BGM_DUCKED_VOLUME_DB,
	AI_BGM_NAME_PREFIX,
	AI_BGM_VOLUME_DB,
	AI_SFX_NAME_PREFIX,
	AI_SFX_VOLUME_DB,
	buildBgmAutoDuckingKeyframes,
	buildBgmSegmentsForTimeline,
	computeSfxStartSeconds,
	detectAudioPeakOffsetSeconds,
	isAiBgmElementName,
	isAiSfxElementName,
	type LibrarySound,
	type PlannedBgmSelection,
	type PlannedSfxInsertion,
	type SpeechWindow,
	type TimelineAudioClipInput,
	type TimelineTransitionCue,
	type TimelineVisualPopCue,
} from "@/service/opencut/auto-audio-shared";

export { AI_BGM_DUCKED_VOLUME_DB, AI_BGM_VOLUME_DB, AI_SFX_VOLUME_DB };

async function downloadAndDecodeSound(sound: LibrarySound): Promise<{
	buffer: AudioBuffer;
	durationSec: number;
	peakOffsetSec: number;
} | null> {
	if (!sound.previewUrl) return null;
	const response = await fetch(sound.previewUrl);
	if (!response.ok) return null;
	const arrayBuffer = await response.arrayBuffer();
	const audioContext = new AudioContext();
	try {
		const buffer = await audioContext.decodeAudioData(arrayBuffer);
		const durationSec =
			sound.duration > 0
				? sound.duration
				: buffer.duration > 0
					? buffer.duration
					: 1;
		const peakOffsetSec =
			buffer.numberOfChannels > 0
				? detectAudioPeakOffsetSeconds({
						samples: buffer.getChannelData(0),
						sampleRate: buffer.sampleRate,
					})
				: 0;
		return { buffer, durationSec, peakOffsetSec };
	} finally {
		void audioContext.close();
	}
}

function deleteNamedAudioElements({
	editor,
	predicate,
}: {
	editor: EditorCore;
	predicate: (name: string) => boolean;
}) {
	const scene = editor.scenes.getActiveScene();
	const stale = scene.tracks.audio.flatMap((track) =>
		track.elements
			.filter((el) => predicate(el.name))
			.map((el) => ({ trackId: track.id, elementId: el.id })),
	);
	if (stale.length > 0) {
		editor.timeline.deleteElements({ elements: stale });
	}
}

function mainTimelineDurationSeconds(editor: EditorCore): number {
	const scene = editor.scenes.getActiveScene();
	let end = 0;
	for (const el of scene.tracks.main.elements) {
		const elEnd =
			mediaTimeToSeconds({ time: el.startTime }) +
			mediaTimeToSeconds({ time: el.duration });
		if (elEnd > end) end = elEnd;
	}
	return end;
}

function extractTimelineCues(tracks: SceneTracks): {
	transitions: TimelineTransitionCue[];
	visualPops: TimelineVisualPopCue[];
} {
	const transitions: TimelineTransitionCue[] = [];
	const visualPops: TimelineVisualPopCue[] = [];

	for (const track of tracks.overlay) {
		if ("hidden" in track && track.hidden) continue;
		for (const el of track.elements) {
			if ("hidden" in el && el.hidden) continue;
			const startSec = mediaTimeToSeconds({ time: el.startTime });
			const durationSec = mediaTimeToSeconds({ time: el.duration });

			if (el.type === "effect" && isTransitionElement(el)) {
				transitions.push({
					effectType: el.effectType,
					cutSec: startSec + durationSec / 2,
					durationSec,
				});
				continue;
			}

			if (el.type === "image" && el.scroOnscreenTextId) {
				visualPops.push({
					kind: "onscreen-text",
					label: el.name || "On-screen text",
					startSec,
				});
			} else if (el.type === "sticker") {
				visualPops.push({
					kind: "sticker",
					label: el.name || el.stickerId,
					startSec,
				});
			} else if (el.type === "video" || el.type === "image") {
				visualPops.push({
					kind: "broll",
					label: el.name || "B-Roll",
					startSec,
				});
			}
		}
	}

	return { transitions, visualPops };
}

function insertDecodedSoundOnAudioTrack({
	editor,
	sound,
	decoded,
	name,
	startTimeSeconds,
	durationSeconds,
	volumeDb,
	animations,
	placement,
}: {
	editor: EditorCore;
	sound: LibrarySound;
	decoded: { buffer: AudioBuffer; durationSec: number };
	name: string;
	startTimeSeconds: number;
	durationSeconds: number;
	volumeDb: number;
	animations?: ElementAnimations;
	placement:
		| { mode: "auto"; trackType: "audio" }
		| { mode: "explicit"; trackId: string }
		| { mode: "new-track"; trackType: "audio"; insertIndex: number };
}): void {
	const duration = Math.max(0.2, durationSeconds);
	const base = buildLibraryAudioElement({
		sourceUrl: sound.previewUrl,
		name,
		duration: mediaTimeFromSeconds({ seconds: duration }),
		startTime: mediaTimeFromSeconds({ seconds: Math.max(0, startTimeSeconds) }),
		buffer: decoded.buffer,
	});
	const element = {
		...base,
		...(animations ? { animations } : {}),
		params: {
			...base.params,
			volume: volumeDb,
		},
	};

	editor.timeline.insertElement({ placement, element });
}

/**
 * Plan Foley + transition/pop hits from VO lines, visual scene prompts, and timeline cues,
 * then align their acoustic attack peaks on audio tracks under the matching beats.
 */
export async function runAutoInsertSfxOnTimeline({
	editor,
	lines,
}: {
	editor: EditorCore;
	lines: Array<{ clipNumber: number; line: string }>;
}): Promise<{
	insertedCount: number;
	error?: string;
	insertions?: PlannedSfxInsertion[];
}> {
	if (lines.length === 0) {
		return { insertedCount: 0, error: "這支影片沒有對白可分析聲效" };
	}
	if (!editor.project.getActiveOrNull()) {
		return { insertedCount: 0, error: "專案尚未載入" };
	}

	const scene = editor.scenes.getActiveScene();
	const slots = matchSubtitleSlots({
		elements: scene.tracks.main.elements,
		clipNumbers: lines.map((l) => l.clipNumber),
	});
	const matchedLines = lines.filter((l) => slots.has(l.clipNumber));
	if (matchedLines.length === 0) {
		return { insertedCount: 0, error: "主軌道上尚未有對應的分鏡片段" };
	}

	const seedClips = getScroVideos()?.clips ?? [];
	const seedByClipNumber = new Map(seedClips.map((c) => [c.clipNumber, c]));

	const enrichedClips: TimelineAudioClipInput[] = matchedLines.map((l) => {
		const slot = slots.get(l.clipNumber);
		const seed = seedByClipNumber.get(l.clipNumber);
		return {
			clipNumber: l.clipNumber,
			line: l.line,
			visualScene: seed?.explainerScene,
			motionCamera: seed?.motionCamera,
			startSec: slot ? mediaTimeToSeconds({ time: slot.startTime }) : undefined,
			durationSec: slot ? mediaTimeToSeconds({ time: slot.duration }) : undefined,
		};
	});

	const { transitions, visualPops } = extractTimelineCues(scene.tracks);

	const planRes = await autoPlanOpencutSfxAction({
		clips: enrichedClips,
		transitions,
		visualPops,
	});
	if (!planRes.ok) {
		return { insertedCount: 0, error: planRes.error };
	}
	if (planRes.insertions.length === 0) {
		return { insertedCount: 0, error: "找不到合適的聲效素材" };
	}

	deleteNamedAudioElements({ editor, predicate: isAiSfxElementName });

	let insertedCount = 0;
	for (const ins of planRes.insertions) {
		const slot = slots.get(ins.clipNumber) ?? scene.tracks.main.elements[0];
		if (!slot) continue;
		const decoded = await downloadAndDecodeSound(ins.sound);
		if (!decoded) continue;

		const clipStartSec = mediaTimeToSeconds({ time: slot.startTime });
		const clipDurSec = mediaTimeToSeconds({ time: slot.duration });
		const startSec = computeSfxStartSeconds({
			clipStartSec,
			clipDurSec,
			beat: ins.beat,
			offsetRatio: ins.offsetRatio,
			targetTimeSec: ins.targetTimeSec,
			peakOffsetSec: decoded.peakOffsetSec,
		});
		const maxDur = Math.max(
			0.25,
			Math.min(decoded.durationSec || ins.sound.duration || 1.2, 3.5),
		);

		insertDecodedSoundOnAudioTrack({
			editor,
			sound: ins.sound,
			decoded,
			name: `${AI_SFX_NAME_PREFIX} ${ins.clipNumber} · ${ins.query}`,
			startTimeSeconds: startSec,
			durationSeconds: maxDur,
			volumeDb: AI_SFX_VOLUME_DB,
			placement: { mode: "auto", trackType: "audio" },
		});
		insertedCount++;
	}

	if (insertedCount === 0) {
		return { insertedCount: 0, error: "無法載入聲效檔案到時間軸" };
	}
	armScroSync();
	return { insertedCount, insertions: planRes.insertions };
}

/**
 * Pick one underscore BGM bed, loop it across the full timeline, and attach
 * auto-ducking + outro fade-out volume keyframes under the spoken VO clips.
 */
export async function runAutoInsertBgmOnTimeline({
	editor,
	lines,
	title,
}: {
	editor: EditorCore;
	lines: Array<{ clipNumber: number; line: string }>;
	title?: string;
}): Promise<{
	inserted: boolean;
	error?: string;
	selection?: PlannedBgmSelection;
}> {
	if (lines.length === 0) {
		return { inserted: false, error: "這支影片沒有對白可分析背景音樂" };
	}
	if (!editor.project.getActiveOrNull()) {
		return { inserted: false, error: "專案尚未載入" };
	}

	const timelineDur = mainTimelineDurationSeconds(editor);
	if (timelineDur < 0.5) {
		return { inserted: false, error: "主軌道尚無足夠長度可鋪背景音樂" };
	}

	const seedClips = getScroVideos()?.clips ?? [];
	const seedByClipNumber = new Map(seedClips.map((c) => [c.clipNumber, c]));
	const enrichedClips: TimelineAudioClipInput[] = lines.map((l) => ({
		clipNumber: l.clipNumber,
		line: l.line,
		visualScene: seedByClipNumber.get(l.clipNumber)?.explainerScene,
	}));

	const planRes = await autoPlanOpencutBgmAction({
		clips: enrichedClips,
		title,
	});
	if (!planRes.ok) {
		return { inserted: false, error: planRes.error };
	}

	const sound = planRes.selection.sound;
	const decoded = await downloadAndDecodeSound(sound);
	if (!decoded) {
		return { inserted: false, error: "無法載入背景音樂檔案到時間軸" };
	}

	deleteNamedAudioElements({ editor, predicate: isAiBgmElementName });

	const scene = editor.scenes.getActiveScene();
	const slots = matchSubtitleSlots({
		elements: scene.tracks.main.elements,
		clipNumbers: lines.map((l) => l.clipNumber),
	});
	const speechWindows: SpeechWindow[] = [];
	for (const line of lines) {
		if (!line.line.trim() || /^\(no dialogue\)$/i.test(line.line.trim())) {
			continue;
		}
		const slot = slots.get(line.clipNumber);
		if (!slot) continue;
		const startSec = mediaTimeToSeconds({ time: slot.startTime });
		const durSec = mediaTimeToSeconds({ time: slot.duration });
		if (durSec > 0.1) {
			speechWindows.push({
				startSec: startSec + 0.08,
				endSec: Math.max(startSec + 0.1, startSec + durSec - 0.12),
			});
		}
	}

	const segments = buildBgmSegmentsForTimeline({
		timelineDurationSec: timelineDur,
		soundDurationSec: decoded.durationSec,
	});
	if (segments.length === 0) {
		return { inserted: false, error: "無法計算背景音樂鋪底區間" };
	}

	const bgmTrackId = editor.timeline.addTrack({
		type: "audio",
		index:
			editor.scenes.getActiveScene().tracks.overlay.length +
			1 +
			editor.scenes.getActiveScene().tracks.audio.length,
	});

	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		const kfPoints = buildBgmAutoDuckingKeyframes({
			segmentStartSec: seg.startSec,
			segmentDurationSec: seg.durationSec,
			timelineDurationSec: timelineDur,
			speechWindows,
			duckedDb: AI_BGM_DUCKED_VOLUME_DB,
			unduckedDb: AI_BGM_VOLUME_DB,
			fadeOutSec: 1.5,
		});

		const animations: ElementAnimations = {
			volume: {
				keys: kfPoints.map((pt) => ({
					id: generateUUID(),
					time: mediaTimeFromSeconds({ seconds: pt.timeSec }),
					value: pt.valueDb,
					segmentToNext: "linear" as const,
					tangentMode: "auto" as const,
				})),
			},
		};

		const segSuffix = segments.length > 1 ? ` (${i + 1}/${segments.length})` : "";
		insertDecodedSoundOnAudioTrack({
			editor,
			sound,
			decoded,
			name: `${AI_BGM_NAME_PREFIX} · ${planRes.selection.mood} · ${sound.name.slice(0, 24)}${segSuffix}`,
			startTimeSeconds: seg.startSec,
			durationSeconds: seg.durationSec,
			volumeDb: AI_BGM_VOLUME_DB,
			animations,
			placement: { mode: "explicit", trackId: bgmTrackId },
		});
	}

	armScroSync();
	return { inserted: true, selection: planRes.selection };
}
