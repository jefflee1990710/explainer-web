import { SettingsView } from "@/app/app/settings/settings-view";
import { requireAppUser } from "@/service/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAppUser();
  return (
    <SettingsView
      initialMarketingOptIn={Boolean(user.marketingEmailsAllowed)}
      acceptedTermsVersion={user.legalAcceptance?.termsVersion ?? null}
    />
  );
}
