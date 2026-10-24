import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";
import { PricingEnterprise } from "./pricing-enterprise";
import { PricingPlans } from "./pricing-plans";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const pricing = getMessages(locale).landing.pricing;
  const title = `Scro — ${pricing.title}`;
  const description = pricing.subtitle;
  return {
    title,
    description,
    alternates: {
      canonical: "/pricing",
    },
    openGraph: {
      title,
      description,
      url: "/pricing",
      siteName: "Scro",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// Public plan list. Signed-in visitors subscribe from billing; everyone else starts at sign-up.
export default async function PricingPage() {
  const session = await getAuthSession();
  return (
    <PolicyLayout>
      <PricingPlans signedIn={Boolean(session)} />
      <PricingEnterprise />
    </PolicyLayout>
  );
}
