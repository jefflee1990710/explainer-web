import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { productsCollection } from "@/dao/products";
import { toPublicProduct } from "@/presentation/serialize";
import type { Product } from "@/model/product";
import { ProductWorkspace } from "@/presentation/components/app/products/product-workspace";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAppUser();
  if (!ObjectId.isValid(id)) notFound();
  const products = await productsCollection();
  const product = (await products.findOne({
    _id: new ObjectId(id),
    clerkUserId: user.clerkUserId,
  })) as Product | null;
  if (!product) notFound();
  return <ProductWorkspace product={toPublicProduct(product)} />;
}
