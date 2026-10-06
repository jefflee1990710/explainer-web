import { put } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { postsCollection } from "@/dao/posts";
import { posterLayerSchema, type PosterLayer } from "@/model/post";
import { requireAppUser } from "@/service/auth";
import { mergeLayerEdits, type LayerEdit } from "@/service/post/layer-edits";

// Save moved, scaled, and rewritten layers, plus a PNG of those layers.
export async function savePostLayers(postId: string, layers: PosterLayer[], thumbnail: File) {
  if (!ObjectId.isValid(postId)) return { ok: false as const, error: "not_found" as const };
  if (!(thumbnail instanceof File) || thumbnail.size === 0 || thumbnail.type !== "image/png") {
    return { ok: false as const, error: "save" as const };
  }
  const user = await requireAppUser();
  const posts = await postsCollection();
  const post = await posts.findOne({ _id: new ObjectId(postId), clerkUserId: user.clerkUserId });
  if (!post) return { ok: false as const, error: "not_found" as const };

  const parsed = layers.flatMap((layer) => {
    const result = posterLayerSchema.safeParse(layer);
    return result.success ? [result.data] : [];
  });
  const edits: LayerEdit[] = parsed.map((layer) => ({
    id: layer.id,
    x: layer.x,
    y: layer.y,
    w: layer.w,
    h: layer.h,
    text: layer.type === "text" ? layer.text : undefined,
    fontSize: layer.type === "text" ? layer.fontSize : undefined,
  }));
  const merged = mergeLayerEdits(post.layers, edits);
  if (!merged.ok) return { ok: false as const, error: "save" as const };

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false as const, error: "save" as const };
  }
  const blob = await put(`explainer/posts/${post._id.toHexString()}-layers.png`, thumbnail, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  await posts.updateOne(
    { _id: post._id, clerkUserId: user.clerkUserId },
    { $set: { layers: merged.layers, thumbnailUrl: blob.url, updatedAt: new Date() } },
  );
  return { ok: true as const };
}
