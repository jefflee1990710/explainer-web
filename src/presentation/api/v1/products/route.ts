import { productsCollection } from "@/dao";
import { readFormData } from "@/service/api/form";
import { apiJson, fromResult, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { createProductAction } from "@/service/product/actions";
import { productAllowance } from "@/service/product/product-limit";
import { toPublicProduct } from "@/presentation/serialize";
import type { Product } from "@/model/product";

// Product library with the plan allowance.
export const GET = withApiUser(async ({ auth }) => {
  const { user } = auth;
  const products = await productsCollection();
  const [sub, docs, count] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    products.find({ clerkUserId: user.clerkUserId }).sort({ updatedAt: -1 }).toArray() as Promise<Product[]>,
    products.countDocuments({ clerkUserId: user.clerkUserId }),
  ]);
  const subscribed = isSubscriptionActive(sub);
  const limit = productAllowance(subscribed && sub ? sub.planId : null, user.email);
  return apiJson({ products: docs.map(toPublicProduct), count, limit, subscribed });
});

// Create a product and queue its realistic blueprint.
// Body keys: name, description, referenceImageUrl[] (uploaded via /uploads).
export const POST = withApiUser(async ({ request }) => {
  const form = await readFormData(request);
  return fromResult(await createProductAction(form), 201);
});
