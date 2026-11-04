import { toPublicPost } from "@/model/post";
import {
  createPostJob,
  deletePostJob,
  editPostElementJob,
  listOwnedPosts,
  loadOwnedPost,
  redetectPostElements,
  selectPostRevision,
} from "@/service/post/pipeline";
import { postTaskTitle } from "@/service/post/prompts";

export {
  createPostJob,
  deletePostJob,
  editPostElementJob,
  listOwnedPosts,
  loadOwnedPost,
  postTaskTitle as postHeadline,
  redetectPostElements,
  selectPostRevision,
  toPublicPost,
};
