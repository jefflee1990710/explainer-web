import { ObjectId } from "mongodb";
import { productsCollection } from "@/dao/products";
import {
  MAX_PRODUCT_REFERENCES,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_NAME_MAX,
  type Product,
} from "@/model/product";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCreditUsd,
  consumeCreditUsd,
  getActiveSubscription,
  isSubscriptionActive,
  refundCreditUsd,
} from "@/service/billing/credits";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { FRAME_COST_USD } from "@/service/credit-costs";
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
    const hasPaidPack =
      resolveUserUsdBalance(user).bonusCreditUsd > 0 ||
      Boolean(user.processedCheckoutIds && user.processedCheckoutIds.length > 0);
    const allowance = productAllowance(
      isSubscriptionActive(sub) && sub ? sub.planId : null,
      user.email,
      hasPaidPack,
    );
    const products = await productsCollection();
    if (allowance != null) {
      const count = await products.countDocuments({ clerkUserId: user.clerkUserId });
      if (count >= allowance) return { ok: false, error: "已達這個方案的產品上限" };
    }

    await assertCanSpendCreditUsd(user, FRAME_COST_USD);
    const spendKey = await consumeCreditUsd(user.clerkUserId, FRAME_COST_USD);
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
        chargedUsd: FRAME_COST_USD,
        createdAt: now,
        updatedAt: now,
      });
      product = await products.findOne({ _id: insert.insertedId });
    } catch (error) {
      await refundCreditUsd(user.clerkUserId, FRAME_COST_USD, spendKey);
      throw error;
    }
    if (!product) return { ok: false, error: "建立產品失敗" };
    await enqueueProductBlueprint(product._id);
    return { ok: true, id: product._id.toHexString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立產品失敗";
    if (message.includes("訂閱")) return { ok: false, error: "請先訂閱才能建立產品" };
    if (message.includes("USD Credit") || message.includes("credits")) {
      return { ok: false, error: "USD Credit 餘額不足" };
    }
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
    await assertCanSpendCreditUsd(user, FRAME_COST_USD);
    const spendKey = await consumeCreditUsd(user.clerkUserId, FRAME_COST_USD);
    const claimed = await products.updateOne(
      { _id: product._id, status: { $in: ["failed", "completed"] } },
      {
        $set: {
          status: "queued",
          creditsCharged: true,
          chargedUsd: FRAME_COST_USD,
          updatedAt: new Date(),
        },
        $unset: { error: "", blueprintUrl: "" },
      },
    );
    if (claimed.modifiedCount !== 1) {
      await refundCreditUsd(user.clerkUserId, FRAME_COST_USD, spendKey);
      return { ok: false, error: "產品藍圖還在生成" };
    }
    await enqueueProductBlueprint(product._id);
    return { ok: true, id: product._id.toHexString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "重試失敗";
    if (message.includes("USD Credit") || message.includes("credits")) {
      return { ok: false, error: "USD Credit 餘額不足" };
    }
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
