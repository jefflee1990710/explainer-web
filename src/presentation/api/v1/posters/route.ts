import { apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { listOwnedPosts } from "@/service/post/create-post";
import {
  createPostJob,
  type CreatePostJobInput,
} from "@/service/post/pipeline";

// GET /api/v1/posters — List owned 2K SAM-3 posters.
export const GET = withApiUser(async ({ auth }) => {
  const posts = await listOwnedPosts(auth.user.clerkUserId);
  return apiJson({ posts });
});

// POST /api/v1/posters — Generate a 2K social poster with SAM-3 element segmentation.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<CreatePostJobInput>(request);
  return fromResult(await createPostJob(body), 201);
});
