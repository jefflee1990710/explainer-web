import { loadRenderableStyle } from "@/service/style/renderable-style";
import { imageModelForSubmit, resolveImageRoute } from "@/service/generation/image-backend";
import { submitImage } from "@/service/higgsfield/generate";
import { PermanentJobError } from "@/service/generation/task-policy";
import { toSent, type Sent } from "@/service/generation/sent";
import type { GenerationJob } from "@/model/generation-job";
import { postsCollection } from "@/dao/posts";
import { posterLayout } from "@/service/post/layouts";
import { blueprintReferenceUrl, postHeadline } from "@/service/post/create-post";
import { buildPosterImagePrompt, posterCopyText, posterSceneLanguage } from "@/service/post/copy";

// Send the stored layers plus the layout blueprint through the scene-image route.
export async function sendPostPreview(job: GenerationJob): Promise<Sent> {
  if (!job.postId) throw new PermanentJobError("找不到海報");
  const posts = await postsCollection();
  const post = await posts.findOne({ _id: job.postId });
  if (!post) throw new PermanentJobError("找不到海報");
  const layout = posterLayout(post.layoutId);
  const wording = posterCopyText(post.layers) || postHeadline(post) || post.instruction;
  const language = posterSceneLanguage(wording);
  const model = imageModelForSubmit(resolveImageRoute(language), true);
  const reference = await blueprintReferenceUrl(layout);
  const characterUrls = (post.cast ?? []).map((member) => member.blueprintUrl).filter(Boolean);
  const productUrls = (post.products ?? []).map((item) => item.blueprintUrl).filter(Boolean);
  let styleName = "";
  let styleLook = "";
  if (post.styleId) {
    try {
      const style = await loadRenderableStyle({
        styleId: post.styleId,
        ownerClerkUserId: post.clerkUserId,
      });
      styleName = style.name;
      styleLook = style.look;
    } catch {
      styleName = "";
    }
  }
  const submitted = await submitImage({
    model,
    prompt: buildPosterImagePrompt(post.layers, {
      styleName,
      styleLook,
      characterCount: characterUrls.length,
      productNames: (post.products ?? []).map((item) => item.name),
    }),
    aspectRatio: "2:3",
    quality: "medium",
    resolution: "1k",
    referenceImageUrls: [reference, ...characterUrls, ...productUrls],
    sceneTextLanguage: language,
  });
  return toSent(model, submitted);
}
