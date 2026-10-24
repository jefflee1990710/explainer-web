import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { TermsDocument } from "@/presentation/components/legal/terms-document";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const legal = getMessages(locale).legal;
  const title = `${legal.terms} | Scro`;
  const description =
    "Scro Terms of Service covering account usage, AI Influencer & explainer video rendering, credits, billing, and content licensing.";
  return {
    title,
    description,
    alternates: {
      canonical: "/terms",
    },
    openGraph: {
      title,
      description,
      url: "/terms",
      siteName: "Scro",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function TermsPage() {
  return (
    <PolicyLayout>
      <TermsDocument />
    </PolicyLayout>
  );
}
