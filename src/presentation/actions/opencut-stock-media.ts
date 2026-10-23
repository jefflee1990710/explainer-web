"use server";

import { requireAppUser } from "@/service/auth";
import {
  planAutoBrollInsertions,
  searchFreeStockMedia,
  type FreeStockMediaItem,
  type PlannedBrollInsertion,
} from "@/service/opencut/stock-media";

export async function searchOpencutStockMediaAction(input: {
  query: string;
  mediaType?: "all" | "image" | "video";
}): Promise<
  | { ok: true; items: FreeStockMediaItem[] }
  | { ok: false; error: string }
> {
  try {
    await requireAppUser();
    const query = input.query.trim();
    if (!query) return { ok: true, items: [] };
    const items = await searchFreeStockMedia({
      query,
      mediaType: input.mediaType ?? "all",
      limit: 18,
    });
    return { ok: true, items };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "搜尋免費素材失敗",
    };
  }
}

export async function autoPlanOpencutBrollAction(input: {
  clips: Array<{ clipNumber: number; line: string }>;
  mediaType?: "all" | "image" | "video";
}): Promise<
  | { ok: true; insertions: PlannedBrollInsertion[] }
  | { ok: false; error: string }
> {
  try {
    await requireAppUser();
    const insertions = await planAutoBrollInsertions({
      clips: input.clips,
      mediaType: input.mediaType ?? "image",
    });
    return { ok: true, insertions };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "自動規劃插圖失敗",
    };
  }
}
