import type { Metadata } from "next";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { PublicPageJsonLd } from "@/presentation/components/seo/public-page-json-ld";
import { salesEmail } from "@/service/billing/plans";
import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { publicPageMetadata } from "@/util/seo/public-metadata";
import { ContactView } from "./contact-view";

const SUPPORT_EMAIL = "cs@thenovax.com";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getMessages(locale).contactPage;
  return publicPageMetadata({
    title: copy.seoTitle,
    description: copy.seoDescription,
    path: "/contact",
    locale,
  });
}

// Public contact page. Support and sales addresses stay visible if the form cannot send.
export default async function ContactPage() {
  const locale = await getRequestLocale();
  const copy = getMessages(locale).contactPage;
  return (
    <PolicyLayout>
      <PublicPageJsonLd path="/contact" title={copy.seoTitle} description={copy.seoDescription} />
      <ContactView supportEmail={SUPPORT_EMAIL} salesEmail={salesEmail()} />
    </PolicyLayout>
  );
}
