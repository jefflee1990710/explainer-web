import { ObjectId } from "mongodb";
import { productsCollection } from "@/dao";
import { apiError, apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { deleteProductAction, retryProductAction } from "@/service/product/actions";
import { toPublicProduct } from "@/presentation/serialize";
import type { Product } from "@/model/product";

type Params = { id: string };

// One product (also the poll target while its blueprint renders).
export const GET = withApiUser<Params>(async ({ auth, params }) => {
  if (!ObjectId.isValid(params.id)) return apiError("產品不存在", 404);
  const products = await productsCollection();
  const product = (await products.findOne({
    _id: new ObjectId(params.id),
    clerkUserId: auth.user.clerkUserId,
  })) as Product | null;
  if (!product) return apiError("產品不存在", 404);
  return apiJson({ product: toPublicProduct(product) });
});

// Product actions. `action`: retry – requeue a failed blueprint.
export const POST = withApiUser<Params>(async ({ request, params }) => {
  const body = await readJson<{ action?: string }>(request);
  if (body.action === "retry") return fromResult(await retryProductAction(params.id));
  return apiError(`未知的 action: ${String(body.action ?? "")}`);
});

export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteProductAction(params.id));
});
