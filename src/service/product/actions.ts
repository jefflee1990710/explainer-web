import { ObjectId } from "mongodb";
import { productsCollection } from "@/dao/products";
import {
  MAX_PRODUCT_REFERENCES,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_NAME_MAX,
  type Product,
} from "@/model/product";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { enqueueProductBlueprint } from "@/service/product/generate";
import { productAllowance } from "@/service/product/product-limit";

export type ProductResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function parseReferenceUrls(formData: FormData) {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const value of formData.getAll("referenceImageUrl")) {
    const url = String(value || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= MAX_PRODUCT_REFERENCES) break;
  }
  return urls;
}

// Create a product and queue its realistic blueprint.
export async function createProductAction(formData: FormData): Promise<ProductResult> {
  try {
    const user = await requireAppUser();
    const name = String(formData.get("name") || "").trim().slice(0, PRODUCT_NAME_MAX);
    const description = String(formData.get("description") || "").trim().slice(0, PRODUCT_DESCRIPTION_MAX);
    const referenceImageUrls = parseReferenceUrls(formData);
    if (!name) return { ok: false, error: "請輸入產品名稱" };
    if (referenceImageUrls.length === 0) return { ok: false, error: "請上傳至少一張產品照片" };

    const sub = await getActiveSubscription(user.clerkUserId);
    const allowance = productAllowance(isSubscriptionActive(sub) && sub ? sub.planId : null, user.email);
    const products = await productsCollection();
    if (allowance != null) {
      const count = await products.countDocuments({ clerkUserId: user.clerkUserId });
      if (count >= allowance) return { ok: false, error: "已達這個方案的產品上限" };
    }

    await assertCanSpendCredits(user, FRAME_COST);
    const spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
    const now = new Date();
    let product: Product | null = null;
    try {
      const insert = await products.insertOne({
        userId: user._id,
        clerkUserId: user.clerkUserId,
        name,
        description,
        referenceImageUrls,
        status: "queued",
        creditsCharged: true,
        createdAt: now,
        updatedAt: now,
      });
      product = await products.findOne({ _id: insert.insertedId });
    } catch (error) {
      await refundCredits(user.clerkUserId, FRAME_COST, spendKey);
      throw error;
    }
    if (!product) return { ok: false, error: "建立產品失敗" };
    await enqueueProductBlueprint(product._id);
    return { ok: true, id: product._id.toHexString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立產品失敗";
    if (message.includes("訂閱")) return { ok: false, error: "請先訂閱才能建立產品" };
    if (message.includes("credits")) return { ok: false, error: "credits 不足" };
    return { ok: false, error: message };
  }
}

// Charge again and rebuild a failed or finished sheet from the same photos.
export async function retryProductAction(productId: string): Promise<ProductResult> {
  try {
    if (!ObjectId.isValid(productId)) return { ok: false, error: "找不到產品" };
    const user = await requireAppUser();
    const products = await productsCollection();
    const product = await products.findOne({ _id: new ObjectId(productId), clerkUserId: user.clerkUserId });
    if (!product) return { ok: false, error: "找不到產品" };
    if (product.status === "queued" || product.status === "in_progress") {
      return { ok: false, error: "產品藍圖還在生成" };
    }
    await assertCanSpendCredits(user, FRAME_COST);
    const spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
    const claimed = await products.updateOne(
      { _id: product._id, status: { $in: ["failed", "completed"] } },
      {
        $set: { status: "queued", creditsCharged: true, updatedAt: new Date() },
        $unset: { error: "", blueprintUrl: "" },
      },
    );
    if (claimed.modifiedCount !== 1) {
      await refundCredits(user.clerkUserId, FRAME_COST, spendKey);
      return { ok: false, error: "產品藍圖還在生成" };
    }
    await enqueueProductBlueprint(product._id);
    return { ok: true, id: product._id.toHexString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "重試失敗";
    if (message.includes("credits")) return { ok: false, error: "credits 不足" };
    return { ok: false, error: message };
  }
}

export async function deleteProductAction(productId: string): Promise<ProductResult> {
  if (!ObjectId.isValid(productId)) return { ok: false, error: "找不到產品" };
  const user = await requireAppUser();
  const products = await productsCollection();
  const result = await products.deleteOne({
    _id: new ObjectId(productId),
    clerkUserId: user.clerkUserId,
  });
  if (result.deletedCount !== 1) return { ok: false, error: "找不到產品" };
  return { ok: true, id: productId };
}
