import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { PrivacyDocument } from "@/presentation/components/legal/privacy-document";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const legal = getMessages(locale).legal;
  const title = `${legal.privacy} | Scro`;
  const description =
    "Scro Privacy Policy explaining how account details, characters, storyboards, uploaded photos, and payment records are collected and protected.";
  return {
    title,
    description,
    alternates: {
      canonical: "/privacy",
    },
    openGraph: {
      title,
      description,
      url: "/privacy",
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

export default function PrivacyPage() {
  return (
    <PolicyLayout>
      <PrivacyDocument />
    </PolicyLayout>
  );
}
