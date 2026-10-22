import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { salesEmail } from "@/service/billing/plans";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";
import { ContactView } from "./contact-view";

const SUPPORT_EMAIL = "cs@thenovax.com";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const copy = getMessages(locale).contactPage;
  return { title: copy.seoTitle, description: copy.seoDescription };
}

// Public contact page. Support and sales addresses stay visible if the form cannot send.
export default function ContactPage() {
  return (
    <PolicyLayout>
      <ContactView supportEmail={SUPPORT_EMAIL} salesEmail={salesEmail()} />
    </PolicyLayout>
  );
}
