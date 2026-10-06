import type { ObjectId } from "mongodb";
import { generationJobsCollection } from "@/dao";
import { productsCollection } from "@/dao/products";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { toSent, type Sent } from "@/service/generation/sent";
import { PermanentJobError } from "@/service/generation/task-policy";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { submitImage } from "@/service/higgsfield/generate";
import type { Product } from "@/model/product";
import { buildProductBlueprintPrompt } from "@/service/product/blueprint-prompt";

export const PRODUCT_BLUEPRINT_MODEL = IMAGE_ROUTE_BY_SCENE_TEXT.en.model;

// Send the realistic product sheet. No job write.
export async function sendProductBlueprint(product: Product): Promise<Sent> {
  const refs = product.referenceImageUrls.filter(Boolean);
  if (refs.length === 0) throw new PermanentJobError("產品需要參考圖");
  const submitted = await submitImage({
    model: PRODUCT_BLUEPRINT_MODEL,
    prompt: buildProductBlueprintPrompt({
      name: product.name,
      description: product.description,
      referenceCount: refs.length,
    }),
    aspectRatio: "1:1",
    quality: "medium",
    resolution: "1k",
    referenceImageUrls: refs,
  });
  return toSent(PRODUCT_BLUEPRINT_MODEL, submitted);
}

// Queue one product sheet. A retry drops the previous settled job.
export async function enqueueProductBlueprint(productId: ObjectId) {
  const jobs = await generationJobsCollection();
  await jobs.deleteMany({
    kind: "product",
    productId,
    status: { $in: ["failed", "nsfw", "completed"] },
  });
  const id = await insertPendingJob({
    productId,
    clipIndex: -1,
    kind: "product",
    model: PRODUCT_BLUEPRINT_MODEL,
  });
  kickJob(id);
}

export async function loadProduct(productId: ObjectId) {
  const products = await productsCollection();
  return products.findOne({ _id: productId });
}
