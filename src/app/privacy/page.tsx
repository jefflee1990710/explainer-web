import type { Metadata } from "next";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { PrivacyDocument } from "@/presentation/components/legal/privacy-document";
import { PublicPageJsonLd } from "@/presentation/components/seo/public-page-json-ld";
import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { publicPageMetadata } from "@/util/seo/public-metadata";

const PRIVACY_DESCRIPTION =
  "Scro Privacy Policy explaining how account details, characters, storyboards, uploaded photos, and payment records are collected and protected.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const legal = getMessages(locale).legal;
  const title = locale === "en" ? "Scro Privacy Policy — Accounts, Uploads, and Billing" : `${legal.privacy} | Scro`;
  return publicPageMetadata({
    title,
    description: PRIVACY_DESCRIPTION,
    path: "/privacy",
    locale,
  });
}

export default async function PrivacyPage() {
  const locale = await getRequestLocale();
  const legal = getMessages(locale).legal;
  const title = locale === "en" ? "Scro Privacy Policy — Accounts, Uploads, and Billing" : `${legal.privacy} | Scro`;
  return (
    <PolicyLayout>
      <PublicPageJsonLd path="/privacy" title={title} description={PRIVACY_DESCRIPTION} />
      <PrivacyDocument />
    </PolicyLayout>
  );
}
