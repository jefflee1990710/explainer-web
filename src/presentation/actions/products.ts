"use server";

import { revalidatePath } from "next/cache";
import {
  createProductAction as createProduct,
  deleteProductAction as deleteProduct,
  retryProductAction as retryProduct,
} from "@/service/product/actions";

function refresh(id?: string) {
  revalidatePath("/app/products");
  if (id) revalidatePath(`/app/products/${id}`);
}

export async function createProductAction(formData: FormData) {
  const result = await createProduct(formData);
  if (result.ok) refresh(result.id);
  return result;
}

export async function retryProductAction(productId: string) {
  const result = await retryProduct(productId);
  refresh(productId);
  return result;
}

export async function deleteProductAction(productId: string) {
  const result = await deleteProduct(productId);
  if (result.ok) refresh();
  return result;
}
