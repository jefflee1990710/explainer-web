"use client";

import type { EditorCore } from "@/opencut/core";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { matchSubtitleSlots } from "@/opencut/embed/scro-subtitle-slots";
import { buildLibraryAudioElement } from "@/opencut/timeline/element-utils";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";
import {
	autoPlanOpencutBgmAction,
	autoPlanOpencutSfxAction,
} from "@/presentation/actions/opencut-auto-audio";
import {
	AI_BGM_NAME_PREFIX,
	AI_BGM_VOLUME_DB,
	AI_SFX_NAME_PREFIX,
	AI_SFX_VOLUME_DB,
	computeSfxStartSeconds,
	isAiBgmElementName,
	isAiSfxElementName,
	type PlannedBgmSelection,
	type PlannedSfxInsertion,
	type LibrarySound,
} from "@/service/opencut/auto-audio-shared";

export { AI_BGM_VOLUME_DB, AI_SFX_VOLUME_DB };

async function downloadAndDecodeSound(sound: LibrarySound): Promise<{
	buffer: AudioBuffer;
	durationSec: number;
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
		return { buffer, durationSec };
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

async function insertLibrarySoundOnAudioTrack({
	editor,
	sound,
	name,
	startTimeSeconds,
	durationSeconds,
	volumeDb,
	placement,
}: {
	editor: EditorCore;
	sound: LibrarySound;
	name: string;
	startTimeSeconds: number;
	durationSeconds: number;
	volumeDb: number;
	placement:
		| { mode: "auto"; trackType: "audio" }
		| { mode: "new-track"; trackType: "audio"; insertIndex: number };
}): Promise<boolean> {
	const decoded = await downloadAndDecodeSound(sound);
	if (!decoded) return false;

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
		params: {
			...base.params,
			volume: volumeDb,
		},
	};

	editor.timeline.insertElement({ placement, element });
	return true;
}

/**
 * Plan Foley hits from VO lines and drop them on audio tracks under the matching clips.
 */
export async function runAutoInsertSfxOnTimeline({
	editor,
	lines,
}: {
	editor: EditorCore;
	lines: Array<{ clipNumber: number; line: string }>;
}): Promise<{ insertedCount: number; error?: string; insertions?: PlannedSfxInsertion[] }> {
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

	const planRes = await autoPlanOpencutSfxAction({ clips: matchedLines });
	if (!planRes.ok) {
		return { insertedCount: 0, error: planRes.error };
	}
	if (planRes.insertions.length === 0) {
		return { insertedCount: 0, error: "找不到合適的聲效素材" };
	}

	deleteNamedAudioElements({ editor, predicate: isAiSfxElementName });

	let insertedCount = 0;
	for (const ins of planRes.insertions) {
		const slot = slots.get(ins.clipNumber);
		if (!slot) continue;
		const clipStartSec = mediaTimeToSeconds({ time: slot.startTime });
		const clipDurSec = mediaTimeToSeconds({ time: slot.duration });
		const startSec = computeSfxStartSeconds({
			clipStartSec,
			clipDurSec,
			beat: ins.beat,
		});
		const maxDur = Math.max(0.25, Math.min(ins.sound.duration || 1.2, 3.5));
		const ok = await insertLibrarySoundOnAudioTrack({
			editor,
			sound: ins.sound,
			name: `${AI_SFX_NAME_PREFIX} ${ins.clipNumber} · ${ins.query}`,
			startTimeSeconds: startSec,
			durationSeconds: maxDur,
			volumeDb: AI_SFX_VOLUME_DB,
			placement: { mode: "auto", trackType: "audio" },
		});
		if (ok) insertedCount++;
	}

	if (insertedCount === 0) {
		return { insertedCount: 0, error: "無法載入聲效檔案到時間軸" };
	}
	armScroSync();
	return { insertedCount, insertions: planRes.insertions };
}

/**
 * Pick one underscore BGM bed and place it under the full talking-head timeline.
 */
export async function runAutoInsertBgmOnTimeline({
	editor,
	lines,
	title,
}: {
	editor: EditorCore;
	lines: Array<{ clipNumber: number; line: string }>;
	title?: string;
}): Promise<{ inserted: boolean; error?: string; selection?: PlannedBgmSelection }> {
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

	const planRes = await autoPlanOpencutBgmAction({ clips: lines, title });
	if (!planRes.ok) {
		return { inserted: false, error: planRes.error };
	}

	deleteNamedAudioElements({ editor, predicate: isAiBgmElementName });

	const sound = planRes.selection.sound;
	const soundDur = sound.duration > 0 ? sound.duration : 30;
	const durationSeconds = Math.min(timelineDur, Math.max(8, soundDur));
	const scene = editor.scenes.getActiveScene();
	const ok = await insertLibrarySoundOnAudioTrack({
		editor,
		sound,
		name: `${AI_BGM_NAME_PREFIX} · ${planRes.selection.mood} · ${sound.name.slice(0, 28)}`,
		startTimeSeconds: 0,
		durationSeconds,
		volumeDb: AI_BGM_VOLUME_DB,
		placement: {
			mode: "new-track",
			trackType: "audio",
			insertIndex: scene.tracks.overlay.length + 1 + scene.tracks.audio.length,
		},
	});

	if (!ok) {
		return { inserted: false, error: "無法載入背景音樂檔案到時間軸" };
	}
	armScroSync();
	return { inserted: true, selection: planRes.selection };
}
