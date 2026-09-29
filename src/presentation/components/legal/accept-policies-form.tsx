"use client";

import { useState } from "react";
import Link from "next/link";
import { acceptCurrentPolicies } from "@/presentation/actions/legal";
import { useI18n } from "@/presentation/components/i18n-provider";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/service/legal/versions";

// Shown after login when the stored versions are missing or older than the published ones.
export function AcceptPoliciesForm() {
  const { t } = useI18n();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await acceptCurrentPolicies({ terms, privacy });
    if (result && !result.ok) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#12141c]">{t("legal.updatedTitle")}</h1>
        <p className="mt-3 text-zinc-600">{t("legal.updatedBody")}</p>
        <p className="mt-2 text-xs text-zinc-500">
          {t("legal.version", { version: `${TERMS_VERSION} / ${PRIVACY_VERSION}` })}
        </p>
      </div>
      <label className="flex items-start gap-3 text-sm text-zinc-700">
        <input type="checkbox" className="mt-1" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
        <span>
          {t("legal.acceptTerms")}{" "}
          <Link href="/terms" className="font-semibold underline" target="_blank">
            {t("legal.terms")}
          </Link>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={privacy}
          onChange={(event) => setPrivacy(event.target.checked)}
        />
        <span>
          {t("legal.acceptPrivacy")}{" "}
          <Link href="/privacy" className="font-semibold underline" target="_blank">
            {t("legal.privacy")}
          </Link>
        </span>
      </label>
      {error ? <p className="text-sm font-medium text-accent">{error}</p> : null}
      <button
        type="submit"
        disabled={pending || !terms || !privacy}
        className="inline-flex w-fit rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] disabled:opacity-50"
      >
        {t("legal.agree")}
      </button>
    </form>
  );
}
