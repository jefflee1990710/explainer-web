"use server";

import { requireAppUser } from "@/service/auth";
import {
  createPostJob,
  deletePostJob,
  editPostElementJob,
  loadOwnedPost,
  redetectPostElements,
  selectPostRevision,
  type CreatePostJobInput,
  type EditPostElementInput,
} from "@/service/post/pipeline";

export async function createPostJobAction(input: CreatePostJobInput) {
  return createPostJob(input);
}

export async function editPostElementJobAction(input: EditPostElementInput) {
  return editPostElementJob(input);
}

export async function redetectPostElementsAction(postId: string) {
  return redetectPostElements(postId);
}

export async function selectPostRevisionAction(input: {
  postId: string;
  revisionId: string;
}) {
  return selectPostRevision(input);
}

export async function deletePostJobAction(postId: string) {
  return deletePostJob(postId);
}

export async function pollPostJobStatusAction(postId: string) {
  const user = await requireAppUser();
  const post = await loadOwnedPost(postId, user.clerkUserId);
  if (!post) {
    return { ok: false as const, error: "找不到貼文" };
  }
  return { ok: true as const, post };
}
