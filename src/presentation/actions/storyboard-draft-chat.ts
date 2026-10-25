"use server";

import type { StoryboardClipDraft, VoLanguage } from "@/model/project";
import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import { requireAppUser } from "@/service/auth";
import {
  draftStoryboardClipsWithAi,
  type StoryboardDraftChatMessage,
} from "@/service/director/storyboard-draft-chat";

// Server action for the Step 03 AI Storyboard Draft Chatroom.
export async function sendStoryboardDraftChatAction(input: {
  skillSlug: string;
  styleId: string;
  source: string;
  spokenScript?: string;
  language?: VoLanguage;
  currentDrafts: StoryboardClipDraft[];
  history: StoryboardDraftChatMessage[];
  message: string;
}): Promise<
  | { ok: true; reply: string; drafts: StoryboardClipDraft[] }
  | { ok: false; error: string }
> {
  try {
    await requireAppUser();
    const message = input.message.trim();
    if (!message) {
      return { ok: false, error: "請輸入訊息" };
    }
    const result = await draftStoryboardClipsWithAi({
      ...input,
      message,
    });
    logServerUxEvent("video_storyboard_chat_drafted", {
      skillSlug: input.skillSlug,
      draftCount: result.drafts.length,
    });
    return {
      ok: true,
      reply: result.reply,
      drafts: result.drafts,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "AI 分鏡草稿產生失敗";
    logServerUxEvent("ux_blocker_storyboard_chat_failed", {
      skillSlug: input.skillSlug,
      error: errMessage,
    });
    return {
      ok: false,
      error: errMessage,
    };
  }
}
