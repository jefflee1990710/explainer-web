"use server";

import { requireAppUser } from "@/service/auth";
import {
	planAutoBgmSelection,
	planAutoSfxInsertions,
	type PlannedBgmSelection,
	type PlannedSfxInsertion,
	type TimelineAudioClipInput,
	type TimelineTransitionCue,
	type TimelineVisualPopCue,
} from "@/service/opencut/auto-audio";

export async function autoPlanOpencutSfxAction(input: {
	clips: TimelineAudioClipInput[];
	transitions?: TimelineTransitionCue[];
	visualPops?: TimelineVisualPopCue[];
}): Promise<
	| { ok: true; insertions: PlannedSfxInsertion[] }
	| { ok: false; error: string }
> {
	try {
		await requireAppUser();
		const insertions = await planAutoSfxInsertions({
			clips: input.clips,
			transitions: input.transitions,
			visualPops: input.visualPops,
		});
		return { ok: true, insertions };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "自動規劃音效失敗",
		};
	}
}

export async function autoPlanOpencutBgmAction(input: {
	clips: TimelineAudioClipInput[];
	title?: string;
}): Promise<
	| { ok: true; selection: PlannedBgmSelection }
	| { ok: false; error: string }
> {
	try {
		await requireAppUser();
		const selection = await planAutoBgmSelection({
			clips: input.clips,
			title: input.title,
		});
		if (!selection) return { ok: false, error: "找不到合適的背景音樂" };
		return { ok: true, selection };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "自動挑選背景音樂失敗",
		};
	}
}
