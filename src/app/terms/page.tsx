import type { Metadata } from "next";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { TermsDocument } from "@/presentation/components/legal/terms-document";
import { PublicPageJsonLd } from "@/presentation/components/seo/public-page-json-ld";
import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { publicPageMetadata } from "@/util/seo/public-metadata";

const TERMS_DESCRIPTION =
  "Scro Terms of Service covering account usage, AI Influencer and explainer video rendering, credits, billing, and content licensing.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const legal = getMessages(locale).legal;
  const title = locale === "en" ? "Scro Terms of Service — Credits, Billing, and Content" : `${legal.terms} | Scro`;
  return publicPageMetadata({
    title,
    description: TERMS_DESCRIPTION,
    path: "/terms",
    locale,
  });
}

export default async function TermsPage() {
  const locale = await getRequestLocale();
  const legal = getMessages(locale).legal;
  const title = locale === "en" ? "Scro Terms of Service — Credits, Billing, and Content" : `${legal.terms} | Scro`;
  return (
    <PolicyLayout>
      <PublicPageJsonLd path="/terms" title={title} description={TERMS_DESCRIPTION} />
      <TermsDocument />
    </PolicyLayout>
  );
}
