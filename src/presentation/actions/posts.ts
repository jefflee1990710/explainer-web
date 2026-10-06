"use server";

import { revalidatePath } from "next/cache";
import { createPost, retryPostPreview } from "@/service/post/create-post";
import { savePostLayers } from "@/service/post/save-layers";
import type { PosterLayer } from "@/model/post";

function refreshPost(id?: string) {
  revalidatePath("/app/posts");
  if (id) revalidatePath(`/app/posts/${id}`);
}

export async function createPostAction(
  layoutId: string,
  instruction: string,
  options?: { styleId?: string; characterIds?: string[]; productIds?: string[] },
) {
  const result = await createPost({ layoutId, instruction, ...options });
  if (result.ok) refreshPost(result.id);
  return result;
}

export async function retryPostPreviewAction(postId: string) {
  const result = await retryPostPreview(postId);
  refreshPost(postId);
  return result;
}

export async function savePostLayersAction(postId: string, layers: PosterLayer[], thumbnail: File) {
  const result = await savePostLayers(postId, layers, thumbnail);
  if (result.ok) refreshPost(postId);
  return result;
}
