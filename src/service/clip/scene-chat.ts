import type {
  ClipStoryboardInput,
  SceneChatChange,
  SceneChatField,
  SceneChatMessage,
  StoryboardRow,
} from "@/model/project";
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

export const SCENE_CHAT_FIELDS = ["startScene", "endScene", "motionCamera", "englishVo"] as const;
export const SCENE_FIELD_MAX = 1200;
export const SCENE_CHAT_MESSAGE_MAX = 2000;
export const SCENE_CHAT_HISTORY = 8;
export const SCENE_CHAT_KEPT = 40;
export const SCENE_CHAT_SUMMARY_MAX = 500;

export type SceneDraft = {
  startScene: string;
  endScene: string;
  motionCamera: string;
  englishVo: string;
};

export type SceneChatEdit = {
  field: SceneChatField;
  content: string;
};

export type SceneChatClipEdit = SceneChatEdit & {
  clipNumber: number;
};

// The fields the production chat is allowed to rewrite, including the spoken line.
export function sceneDraftFromClip(
  row: Pick<StoryboardRow, "explainerScene" | "startScene" | "endScene" | "motionCamera" | "englishVo">,
): SceneDraft {
  return {
    startScene: clipStartScene(row),
    endScene: clipEndScene(row),
    motionCamera: row.motionCamera,
    englishVo: row.englishVo,
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
    if ((edit.field === "startScene" || edit.field === "endScene" || edit.field === "englishVo") && !content) {
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

// Default scope is the open clip. "all" applies edits whose clip number exists.
export function applySceneChatToClips(input: {
  clips: StoryboardRow[];
  currentClip: number;
  scope: "current" | "all";
  edits: SceneChatClipEdit[];
  skillSlug?: string;
}): { ok: true; clips: StoryboardRow[]; changed: SceneChatChange[] } | { ok: false; error: string } {
  const allowed = new Set(
    input.scope === "all" ? input.clips.map((clip) => clip.clipNumber) : [input.currentClip],
  );
  const grouped = new Map<number, SceneChatEdit[]>();
  for (const edit of input.edits) {
    if (!allowed.has(edit.clipNumber)) continue;
    const list = grouped.get(edit.clipNumber) ?? [];
    list.push({ field: edit.field, content: edit.content });
    grouped.set(edit.clipNumber, list);
  }

  const changed: SceneChatChange[] = [];
  const clips: StoryboardRow[] = [];
  for (const clip of input.clips) {
    const edits = grouped.get(clip.clipNumber);
    if (!edits?.length) {
      clips.push(clip);
      continue;
    }
    const applied = applySceneChatEdits(sceneDraftFromClip(clip), edits);
    if (!applied.ok) return applied;
    if (!applied.changed.length) {
      clips.push(clip);
      continue;
    }
    changed.push({ clipNumber: clip.clipNumber, fields: applied.changed });
    clips.push(clipWithSceneDraft(clip, applied.draft, input.skillSlug));
  }
  return { ok: true, clips, changed };
}

// Fields the newest assistant turn rewrote on this clip. Older turns stay unmarked.
export function highlightedSceneFields(
  chats:
    | Array<{
        clipNumber: number;
        messages: Array<{
          role: SceneChatMessage["role"];
          createdAt: Date | string;
          changedPaths?: SceneChatMessage["changedPaths"];
          changedClips?: SceneChatMessage["changedClips"];
        }>;
      }>
    | undefined,
  clipNumber: number,
): SceneChatField[] {
  let newestAt = -1;
  let fields: SceneChatField[] = [];
  for (const thread of chats ?? []) {
    for (const message of thread.messages) {
      if (message.role !== "assistant") continue;
      const at = message.createdAt instanceof Date ? message.createdAt.getTime() : Date.parse(String(message.createdAt));
      if (Number.isNaN(at) || at < newestAt) continue;
      const listed = message.changedClips?.find((item) => item.clipNumber === clipNumber)?.fields;
      const own = !message.changedClips?.length && thread.clipNumber === clipNumber ? message.changedPaths : undefined;
      newestAt = at;
      fields = listed ?? own ?? [];
    }
  }
  return fields;
}

const REDRAW_IN_FLIGHT = new Set(["queued", "in_progress"]);

// Whether this chat turn's redraw button can be pressed again.
// A still submitted at or after the reply counts; an older picture, and the clip video, do not.
export function sceneRedrawPhase(input: {
  messageAt?: string;
  frames: Array<{ status: string; submittedAt?: string }>;
}): "ready" | "running" | "done" | "failed" {
  const frames = freshRedrawFrames(input);
  if (!frames.length) return "ready";
  if (frames.some((frame) => REDRAW_IN_FLIGHT.has(frame.status))) return "running";
  if (frames.some((frame) => frame.status === "failed")) return "failed";
  if (frames.every((frame) => frame.status === "completed")) return "done";
  return "running";
}

// Time shown on "已更新" once every fresh still has finished.
export function sceneRedrawFinishedAt(input: {
  messageAt?: string;
  frames: Array<{ status: string; submittedAt?: string }>;
}): string | undefined {
  if (sceneRedrawPhase(input) !== "done") return undefined;
  return freshRedrawFrames(input)
    .map((frame) => frame.submittedAt)
    .filter((submittedAt): submittedAt is string => Boolean(submittedAt))
    .sort()
    .at(-1);
}

function freshRedrawFrames(input: {
  messageAt?: string;
  frames: Array<{ status: string; submittedAt?: string }>;
}) {
  const at = input.messageAt;
  if (!at) return [];
  return input.frames.filter((frame) => frame.submittedAt && frame.submittedAt >= at);
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
        englishVo: draft.englishVo,
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
    englishVo: draft.englishVo,
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
  return `You edit explainer-video clips. You may change only these fields:
- startScene: the opening still at t=0. One frozen picture: who, what, where, and any on-screen text. Not a motion paragraph.
- endScene: the closing still. One frozen picture of the start still after motionCamera has finished. The camera is where that motion lands. Not a new scene.
- motionCamera: how the camera and the action move from the start still to the end still. Timestamps are welcome. Not a still description.
- englishVo: the spoken line shown on the left. Change it when the user asks to change what is said.

Rules:
- scope is "current" unless the user asks to change every clip, all clips, or the whole video. Then scope is "all".
- On "current", return edits only for the current clip number.
- On "all", return an edit for every clip whose text must change. Each edit includes that clip's clipNumber.
- Change only what the user asks for. Return each changed field with its full new content. Omit unchanged fields.
- When the user asks to replace a word, replace every copy of it in englishVo, startScene, endScene, and motionCamera of each clip you edit.
- Subtitle size and place live in the scene's Subtitle sentence. Change that sentence when the user asks. Do not invent a new font, color, paper, or brush. The selected subtitle look is applied when the still is painted.
- Keep each clip's existing language. Do not translate it unless the user asks.
- Keep each field under ${SCENE_FIELD_MAX} characters.
- summary: one or two short sentences in the same language as the user's request. Do not put the new field text only in the summary.
- If the user is only asking a question, return scope "current", an empty edits array, and answer in summary.`;
}

export function sceneChatUserPrompt(input: {
  clips: Array<StoryboardRow & { clipNumber: number }>;
  currentClip: number;
  history: SceneChatMessage[];
  message: string;
}) {
  const blocks = input.clips.map((clip) => {
    const draft = sceneDraftFromClip(clip);
    const mark = clip.clipNumber === input.currentClip ? " (current)" : "";
    const fields = SCENE_CHAT_FIELDS.map((field) => `${field}:\n${draft[field]}`).join("\n\n");
    return `Clip ${clip.clipNumber}${mark}:\n${fields}`;
  });
  const history = input.history
    .slice(-SCENE_CHAT_HISTORY)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");
  return `${blocks.join("\n\n")}\n\nRecent chat:\n${history || "(none)"}\n\nUser request:\n${input.message}`;
}
