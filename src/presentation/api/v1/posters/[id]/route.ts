import { apiError, apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import {
  deletePostJob,
  editPostElementJob,
  loadOwnedPost,
  redetectPostElements,
  selectPostRevision,
  type EditPostElementInput,
} from "@/service/post/pipeline";

type Params = { id: string };

// GET /api/v1/posters/[id] — Fetch poster details, revisions, and detected SAM-3 elements.
export const GET = withApiUser<Params>(async ({ auth, params }) => {
  const post = await loadOwnedPost(params.id, auth.user.clerkUserId);
  if (!post) return apiError("找不到貼文", 404);
  return apiJson({ post });
});

// POST /api/v1/posters/[id] — Edit a detected poster element, redetect elements, or switch revision.
export const POST = withApiUser<Params>(async ({ request, params }) => {
  const body = await readJson<
    Partial<EditPostElementInput> & {
      action?: "edit_element" | "redetect" | "select_revision";
      revisionId?: string;
    }
  >(request);

  if (body.action === "redetect") {
    return fromResult(await redetectPostElements(params.id));
  }
  if (body.action === "select_revision") {
    if (!body.revisionId) return apiError("缺少 revisionId");
    return fromResult(
      await selectPostRevision({
        postId: params.id,
        revisionId: body.revisionId,
      }),
    );
  }
  if (!body.elementId || !body.editMode) {
    return apiError("缺少 elementId 或 editMode");
  }
  return fromResult(
    await editPostElementJob({
      postId: params.id,
      elementId: body.elementId,
      editMode: body.editMode,
      instruction: body.instruction,
      characterId: body.characterId,
      characterLookUrl: body.characterLookUrl,
      productId: body.productId,
      referenceImageUrl: body.referenceImageUrl,
    }),
  );
});

// DELETE /api/v1/posters/[id] — Delete a poster and its stored media.
export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deletePostJob(params.id));
});
