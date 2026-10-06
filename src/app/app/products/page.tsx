import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { productsCollection } from "@/dao/products";
import { toPublicProduct } from "@/presentation/serialize";
import { productAllowance } from "@/service/product/product-limit";
import type { Product } from "@/model/product";
import { ProductGrid } from "@/presentation/components/app/products/product-grid";
import { ProductsHeader } from "@/presentation/components/app/products/products-header";

export default async function ProductsPage() {
  const user = await requireAppUser();
  const products = await productsCollection();
  const [sub, docs, count] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    products.find({ clerkUserId: user.clerkUserId }).sort({ updatedAt: -1 }).toArray() as Promise<Product[]>,
    products.countDocuments({ clerkUserId: user.clerkUserId }),
  ]);
  const subscribed = isSubscriptionActive(sub);
  const limit = productAllowance(subscribed && sub ? sub.planId : null, user.email);

  return (
    <div>
      <ProductsHeader count={count} limit={limit} />
      <div className="mt-8">
        <ProductGrid products={docs.map(toPublicProduct)} atLimit={limit != null && count >= limit} />
      </div>
    </div>
  );
}
