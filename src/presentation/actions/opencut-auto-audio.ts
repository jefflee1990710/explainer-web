"use server";

import { requireAppUser } from "@/service/auth";
import {
  planAutoBgmSelection,
  planAutoSfxInsertions,
  type PlannedBgmSelection,
  type PlannedSfxInsertion,
} from "@/service/opencut/auto-audio";

export async function autoPlanOpencutSfxAction(input: {
  clips: Array<{ clipNumber: number; line: string }>;
}): Promise<
  | { ok: true; insertions: PlannedSfxInsertion[] }
  | { ok: false; error: string }
> {
  try {
    await requireAppUser();
    const insertions = await planAutoSfxInsertions({ clips: input.clips });
    return { ok: true, insertions };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "自動規劃音效失敗",
    };
  }
}

export async function autoPlanOpencutBgmAction(input: {
  clips: Array<{ clipNumber: number; line: string }>;
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
