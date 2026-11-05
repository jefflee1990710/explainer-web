import type { Metadata } from "next";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { PublicPageJsonLd } from "@/presentation/components/seo/public-page-json-ld";
import { getAuthSession } from "@/service/auth";
import { PLANS } from "@/service/billing/plans";
import { getSiteUrl } from "@/util/app-url";
import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { publicPageMetadata } from "@/util/seo/public-metadata";
import { PricingEnterprise } from "./pricing-enterprise";
import { PricingPlans } from "./pricing-plans";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const pricing = getMessages(locale).landing.pricing;
  const title = pricing.seoTitle || `Scro — ${pricing.title}`;
  const description = pricing.seoDescription || pricing.subtitle;
  return publicPageMetadata({ title, description, path: "/pricing", locale });
}

// Public plan list. Signed-in visitors subscribe from billing; everyone else starts at sign-up.
export default async function PricingPage() {
  const session = await getAuthSession();
  const locale = await getRequestLocale();
  const pricing = getMessages(locale).landing.pricing;
  const siteUrl = getSiteUrl();
  const pricingOffersJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}/pricing#software`,
    name: "Scro",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/pricing`,
    description: pricing.seoDescription || pricing.subtitle,
    offers: Object.values(PLANS).map((plan) => ({
      "@type": "Offer",
      name: `Scro ${plan.name} Plan`,
      price: String(plan.amountUsd),
      priceCurrency: "USD",
      url: `${siteUrl}/pricing`,
      availability: "https://schema.org/InStock",
      description: `${plan.monthlyCredits.toLocaleString("en-US")} monthly credits`,
    })),
  };
  return (
    <PolicyLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingOffersJsonLd) }}
      />
      <PublicPageJsonLd
        path="/pricing"
        title={pricing.seoTitle || `Scro — ${pricing.title}`}
        description={pricing.seoDescription || pricing.subtitle}
      />
      <PricingPlans signedIn={Boolean(session)} />
      <PricingEnterprise />
    </PolicyLayout>
  );
}
