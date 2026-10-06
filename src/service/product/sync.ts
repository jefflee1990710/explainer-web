import type { ObjectId } from "mongodb";
import { productsCollection } from "@/dao/products";
import { refundCredits } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { persistMedia } from "@/service/higgsfield/persist";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";

// Mark failed and refund the sheet credit once.
export async function failProduct(productId: ObjectId, message: string) {
  const products = await productsCollection();
  const product = await products.findOne({ _id: productId });
  if (!product || product.status === "completed") return;
  const now = new Date();
  const claimed = await products.updateOne(
    { _id: productId, creditsCharged: true, status: { $ne: "completed" } },
    {
      $set: {
        status: "failed",
        error: message,
        creditsCharged: false,
        updatedAt: now,
      },
    },
  );
  if (claimed.modifiedCount !== 1) {
    await products.updateOne(
      { _id: productId, status: { $nin: ["completed", "failed"] } },
      { $set: { status: "failed", error: message, updatedAt: now } },
    );
    return;
  }
  try {
    await refundCredits(product.clerkUserId, FRAME_COST);
  } catch (error) {
    await products.updateOne({ _id: productId }, { $set: { creditsCharged: true, updatedAt: new Date() } });
    throw error;
  }
}

// Mirror a product job onto the product document.
export async function syncProductJob(job: GenerationJob, status: GenerationStatus, outputUrl?: string) {
  if (!job.productId) return;
  const products = await productsCollection();
  const product = await products.findOne({ _id: job.productId });
  if (!product || product.status === "completed") return;

  if (status === "failed" || status === "nsfw") {
    await failProduct(job.productId, status === "nsfw" ? "產品圖未通過內容檢查" : "產品藍圖產生失敗");
    return;
  }
  if (status !== "completed" || !outputUrl) {
    await products.updateOne(
      { _id: job.productId, status: { $ne: "completed" } },
      { $set: { status: "in_progress", updatedAt: new Date() } },
    );
    return;
  }

  let blueprintUrl: string;
  try {
    blueprintUrl = await persistMedia(
      outputUrl,
      `explainer/products/${job.productId.toHexString()}/blueprint`,
    );
  } catch {
    await failProduct(job.productId, "產品藍圖保存失敗");
    return;
  }
  await products.updateOne(
    { _id: job.productId },
    {
      $set: {
        status: "completed",
        blueprintUrl,
        creditsCharged: false,
        updatedAt: new Date(),
      },
      $unset: { error: "" },
    },
  );
}
