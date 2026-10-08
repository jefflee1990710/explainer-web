"use server";

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
