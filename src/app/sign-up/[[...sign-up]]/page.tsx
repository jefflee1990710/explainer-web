import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { AuthForm } from "@/presentation/components/auth/auth-form";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const auth = getMessages(locale).auth;
  return {
    title: `${auth.signUpTitle} | Scro`,
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <PolicyLayout>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <AuthForm mode="sign-up" nextPath={params.next} />
      </div>
    </PolicyLayout>
  );
}
