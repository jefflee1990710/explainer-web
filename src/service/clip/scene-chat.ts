import type { ClipStoryboardInput, SceneChatField, SceneChatMessage, StoryboardRow } from "@/model/project";
import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
  isDualBeatSkill,
  joinSceneBeats,
  syncDualBeatFields,
} from "@/service/director/dual-beat";
import { chatRateLimited } from "@/service/director/chat-rate-limit";

export const SCENE_CHAT_FIELDS = ["startScene", "endScene", "motionCamera"] as const;
export const SCENE_FIELD_MAX = 1200;
export const SCENE_CHAT_MESSAGE_MAX = 2000;
export const SCENE_CHAT_HISTORY = 8;
export const SCENE_CHAT_KEPT = 40;
export const SCENE_CHAT_SUMMARY_MAX = 500;

export type SceneDraft = {
  startScene: string;
  endScene: string;
  motionCamera: string;
};

export type SceneChatEdit = {
  field: SceneChatField;
  content: string;
};

// The three fields the production chat is allowed to rewrite.
export function sceneDraftFromClip(row: Pick<StoryboardRow, "explainerScene" | "startScene" | "endScene" | "motionCamera">): SceneDraft {
  return {
    startScene: clipStartScene(row),
    endScene: clipEndScene(row),
    motionCamera: row.motionCamera,
  };
}

export function sceneChatRateLimited(messages: SceneChatMessage[] | undefined, now: Date) {
  return chatRateLimited(messages, now);
}

export function normalizeSceneChatSummary(summary: string, changedCount: number) {
  const trimmed = summary.trim().slice(0, SCENE_CHAT_SUMMARY_MAX).trim();
  if (trimmed) return trimmed;
  return changedCount > 0 ? `已更新 ${changedCount} 個欄位` : "沒有修改畫面。";
}

// Apply the model's field edits. Unchanged text is dropped. Start and end cannot be blank.
export function applySceneChatEdits(
  draft: SceneDraft,
  edits: SceneChatEdit[],
): { ok: true; draft: SceneDraft; changed: SceneChatField[] } | { ok: false; error: string } {
  const next: SceneDraft = { ...draft };
  const changed: SceneChatField[] = [];
  for (const edit of edits) {
    if (!SCENE_CHAT_FIELDS.includes(edit.field)) {
      return { ok: false, error: "AI 修改了不存在的欄位" };
    }
    const content = edit.content.trim().slice(0, SCENE_FIELD_MAX);
    if ((edit.field === "startScene" || edit.field === "endScene") && !content) {
      return { ok: false, error: "起始與結尾畫面不能空白" };
    }
    if (content === next[edit.field]) continue;
    next[edit.field] = content;
    if (!changed.includes(edit.field)) changed.push(edit.field);
  }
  if (!next.startScene.trim() || !next.endScene.trim()) {
    return { ok: false, error: "起始與結尾畫面不能空白" };
  }
  return { ok: true, draft: next, changed };
}

// Write the draft back onto the clip. Single-scene skills keep one labeled scene string.
export function clipWithSceneDraft(clip: StoryboardRow, draft: SceneDraft, skillSlug?: string): StoryboardRow {
  const editedAt = new Date().toISOString();
  if (isDualBeatSkill(skillSlug)) {
    return {
      ...clip,
      ...syncDualBeatFields({
        explainerScene: clip.explainerScene,
        motionCamera: draft.motionCamera,
        englishVo: clip.englishVo,
        startScene: draft.startScene,
        endScene: draft.endScene,
        startVo: clip.startVo || clipStartVo(clip),
        endVo: clip.endVo || clipEndVo(clip),
      }),
      editedAt,
    };
  }
  const { startScene: _start, endScene: _end, ...rest } = clip;
  return {
    ...rest,
    explainerScene: joinSceneBeats(draft.startScene, draft.endScene),
    motionCamera: draft.motionCamera,
    editedAt,
  };
}

// Input for a redraw. Single-scene clips must not send start/end or the save treats them as dual-beat.
export function regenStoryboardInput(clip: StoryboardRow, skillSlug?: string): ClipStoryboardInput {
  if (isDualBeatSkill(skillSlug)) {
    return syncDualBeatFields({
      explainerScene: clip.explainerScene,
      motionCamera: clip.motionCamera,
      englishVo: clip.englishVo,
      startScene: clipStartScene(clip),
      endScene: clipEndScene(clip),
      startVo: clipStartVo(clip),
      endVo: clipEndVo(clip),
    });
  }
  return {
    explainerScene: clip.explainerScene,
    motionCamera: clip.motionCamera,
    englishVo: clip.englishVo,
  };
}

export function sceneChatSystemPrompt() {
  return `You edit one clip of an explainer video. You may change only these fields:
- startScene: the opening still at t=0. One frozen picture: who, what, where, and any on-screen text. Not a motion paragraph.
- endScene: the closing still. One frozen picture after this clip's action. Not a copy of the start unless the user asks to keep it.
- motionCamera: how the camera and the action move from the start still to the end still. Timestamps are welcome. Not a still description.

Rules:
- Change only what the user asks for. Return each changed field with its full new content. Omit unchanged fields.
- Keep the scene's existing language. Do not translate it unless the user asks.
- Keep each field under ${SCENE_FIELD_MAX} characters.
- Do not change the spoken line.
- summary: one or two short sentences in the same language as the user's request.
- If the user is only asking a question, return an empty edits array and answer in summary.`;
}

export function sceneChatUserPrompt(input: {
  draft: SceneDraft;
  history: SceneChatMessage[];
  message: string;
}) {
  const current = SCENE_CHAT_FIELDS.map((field) => `${field}:\n${input.draft[field]}`).join("\n\n");
  const history = input.history
    .slice(-SCENE_CHAT_HISTORY)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");
  return `Current clip:\n${current}\n\nRecent chat:\n${history || "(none)"}\n\nUser request:\n${input.message}`;
}
