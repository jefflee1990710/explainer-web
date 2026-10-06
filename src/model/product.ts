import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export {
  MAX_PRODUCT_REFERENCES,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_MAX,
  PRODUCT_NAME_MAX,
} from "@/model/product-constants";

export type ProductStatus = "queued" | "in_progress" | "completed" | "failed";

// Reusable product. Always photorealistic — there is no style.
export type Product = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  name: string;
  description: string;
  referenceImageUrls: string[];
  blueprintUrl?: string;
  status: ProductStatus;
  error?: string;
  creditsCharged: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Snapshot stored on a video or poster so later edits to the product do not change it.
export type ProductShot = {
  productId: ObjectId;
  name: string;
  blueprintUrl: string;
};

export const productShotSchema: z.ZodType<ProductShot> = z.object({
  productId: objectIdSchema,
  name: z.string(),
  blueprintUrl: z.string(),
});
