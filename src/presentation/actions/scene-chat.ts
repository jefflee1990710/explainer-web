"use server";

import {
  openFramePromptChatAction as openFramePromptChat,
  regenerateFramePromptAction as regenerateFramePrompt,
  sendFramePromptChatAction as sendFramePromptChat,
} from "@/service/clip/frame-prompt-chat-actions";
import {
  regenerateClipSceneMediaAction as regenerateClipSceneMedia,
  sendClipSceneChatAction as sendClipSceneChat,
} from "@/service/clip/scene-chat-actions";

export async function sendClipSceneChatAction(
  ...args: Parameters<typeof sendClipSceneChat>
) {
  return sendClipSceneChat(...args);
}

export async function regenerateClipSceneMediaAction(
  ...args: Parameters<typeof regenerateClipSceneMedia>
) {
  return regenerateClipSceneMedia(...args);
}

export async function openFramePromptChatAction(
  ...args: Parameters<typeof openFramePromptChat>
) {
  return openFramePromptChat(...args);
}

export async function sendFramePromptChatAction(
  ...args: Parameters<typeof sendFramePromptChat>
) {
  return sendFramePromptChat(...args);
}

export async function regenerateFramePromptAction(
  ...args: Parameters<typeof regenerateFramePrompt>
) {
  return regenerateFramePrompt(...args);
}
