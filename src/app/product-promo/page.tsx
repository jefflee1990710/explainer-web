import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { marketingPageMetadata } from "@/util/i18n/marketing-page-meta";
import { ProductPromoCost } from "./product-promo-cost";
import { ProductPromoCta } from "./product-promo-cta";
import { ProductPromoFlow } from "./product-promo-flow";
import { ProductPromoHero } from "./product-promo-hero";
import { ProductPromoWild } from "./product-promo-wild";

export const generateMetadata = () => marketingPageMetadata("productPromoPage");

// Marketing: upload product → virtual host promotes in wild AI locations.
export default async function ProductPromoMarketingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session);
  return (
    <PolicyLayout>
      <ProductPromoHero signedIn={signedIn} />
      <ProductPromoCost />
      <ProductPromoFlow />
      <ProductPromoWild />
      <ProductPromoCta signedIn={signedIn} />
    </PolicyLayout>
  );
}
